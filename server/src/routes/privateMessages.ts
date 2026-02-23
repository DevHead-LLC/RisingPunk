import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth';
import { User } from '../models/User';
import { PrivateMessage, getConversationKey } from '../models/PrivateMessage';
import { filterBadWords } from '../utils/contentModeration';
import { getAdminUserIds } from '../config/env';

const router = express.Router();

const PM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PM_RATE_LIMIT_MAX = 10;
const pmRateLimit = new Map<string, { count: number; windowStartMs: number }>();

function evictExpiredPmRateLimit(nowMs: number): void {
  for (const [key, val] of pmRateLimit.entries()) {
    if (nowMs - val.windowStartMs >= PM_RATE_LIMIT_WINDOW_MS) {
      pmRateLimit.delete(key);
    }
  }
}

// GET /conversations — list conversations for current user (other user, last message, unread count); exclude blocked
router.get('/conversations', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId).select('blockedUserIds').lean();
    const userIdObj = typeof userId === 'string'
      ? new mongoose.Types.ObjectId(userId)
      : (userId as mongoose.Types.ObjectId);
    const blockedList = (user?.blockedUserIds || []).map((id: unknown) => new mongoose.Types.ObjectId(String(id)));

    const pipeline: any[] = [
      { $match: { $or: [{ senderId: userIdObj }, { recipientId: userIdObj }] } },
      { $addFields: {
        otherId: { $cond: [{ $eq: ['$senderId', userIdObj] }, '$recipientId', '$senderId'] },
      } },
      ...(blockedList.length > 0 ? [{ $match: { otherId: { $nin: blockedList } } }] : []),
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$otherId',
        lastMessage: { $first: '$message' },
        lastAt: { $first: '$createdAt' },
        unreadCount: { $sum: { $cond: [
          { $and: [{ $eq: ['$recipientId', userIdObj] }, { $eq: ['$readAt', null] }] },
          1,
          0,
        ] } },
      } },
      { $sort: { lastAt: -1 } },
      { $limit: 50 },
    ];
    const aggregated = await PrivateMessage.aggregate(pipeline);

    const withUsernames = await Promise.all(aggregated.map(async (row: any) => {
      const otherId = row._id;
      const other = await User.findById(otherId).select('handle').lean();
      return {
        otherUserId: String(otherId),
        otherUsername: other?.handle ?? 'Unknown',
        lastMessage: row.lastMessage,
        lastAt: row.lastAt,
        unreadCount: row.unreadCount ?? 0,
      };
    }));

    res.json({ success: true, conversations: withUsernames });
  } catch (error: any) {
    console.error('Error listing PM conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /conversations/:otherUserId/messages — get thread (paginated)
router.get('/conversations/:otherUserId/messages', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const otherUserId = req.params.otherUserId;
    if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).json({ error: 'Valid other user ID is required' });
      return;
    }

    const user = await User.findById(userId).select('blockedUserIds').lean();
    const blockedSet = new Set((user?.blockedUserIds || []).map((id: unknown) => String(id)));
    if (blockedSet.has(otherUserId)) {
      res.status(403).json({ error: 'Cannot view conversation with blocked user' });
      return;
    }

    const userIdObj = typeof userId === 'string'
      ? new mongoose.Types.ObjectId(userId)
      : (userId as mongoose.Types.ObjectId);
    const key = getConversationKey(userIdObj, new mongoose.Types.ObjectId(otherUserId));
    const limit = Math.min(parseInt(String(req.query.limit || 100), 10) || 100, 100);

    const messages = await PrivateMessage.find({
      $or: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    const formatted = messages.map((msg: any) => ({
      id: String(msg._id),
      senderId: String(msg.senderId),
      recipientId: String(msg.recipientId),
      senderUsername: msg.senderUsername,
      message: msg.message,
      timestamp: msg.createdAt,
      readAt: msg.readAt,
      isFromAdmin: msg.isFromAdmin ?? false,
    }));

    res.json({ success: true, messages: formatted });
  } catch (error: any) {
    console.error('Error fetching PM thread:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /conversations/:recipientId/messages — send message
router.post('/conversations/:recipientId/messages', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const recipientId = req.params.recipientId;
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      res.status(400).json({ error: 'Valid recipient ID is required' });
      return;
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }
    if (trimmed.length > 500) {
      res.status(400).json({ error: 'Message must be 500 characters or less' });
      return;
    }

    const sender = await User.findById(userId).select('handle blockedUserIds').lean();
    if (!sender) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const recipient = await User.findById(recipientId).select('handle blockedUserIds').lean();
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }

    const senderBlocked = new Set((sender.blockedUserIds || []).map((id: unknown) => String(id)));
    const recipientBlocked = new Set((recipient.blockedUserIds || []).map((id: unknown) => String(id)));
    if (senderBlocked.has(recipientId) || recipientBlocked.has(String(userId))) {
      res.status(403).json({ error: 'Cannot send message; user is blocked' });
      return;
    }

    const adminIds = getAdminUserIds();
    const isAdmin = adminIds.some((id) => id.toString() === String(userId));
    if (!isAdmin) {
      const nowMs = Date.now();
      evictExpiredPmRateLimit(nowMs);
      const rateKey = String(userId);
      const entry = pmRateLimit.get(rateKey);
      if (entry) {
        if (nowMs - entry.windowStartMs >= PM_RATE_LIMIT_WINDOW_MS) {
          pmRateLimit.delete(rateKey);
        } else if (entry.count >= PM_RATE_LIMIT_MAX) {
          res.status(429).json({ error: 'Too many messages. Please wait a moment before sending again.' });
          return;
        }
      }
      const toIncrement = pmRateLimit.get(rateKey);
      if (!toIncrement) {
        pmRateLimit.set(rateKey, { count: 1, windowStartMs: nowMs });
      } else {
        toIncrement.count += 1;
      }
    }

    const filteredMessage = filterBadWords(trimmed);
    const doc = new PrivateMessage({
      senderId: userId,
      recipientId: new mongoose.Types.ObjectId(recipientId),
      senderUsername: sender.handle || 'Unknown',
      message: filteredMessage,
      originalMessage: trimmed,
      readAt: null,
      isFromAdmin: isAdmin,
    });
    await doc.save();

    res.json({
      success: true,
      message: {
        id: String(doc._id),
        senderId: String(doc.senderId),
        recipientId: String(doc.recipientId),
        senderUsername: doc.senderUsername,
        message: doc.message,
        timestamp: doc.createdAt,
        readAt: doc.readAt,
        isFromAdmin: doc.isFromAdmin,
      },
    });
  } catch (saveErr: any) {
    const uid = req.user?._id;
    if (uid && !getAdminUserIds().some((id) => id.toString() === String(uid))) {
      const entry = pmRateLimit.get(String(uid));
      if (entry) {
        entry.count -= 1;
        if (entry.count <= 0) pmRateLimit.delete(String(uid));
      }
    }
    console.error('Error sending PM:', saveErr);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /conversations/:otherUserId/read — mark messages in conversation as read (where current user is recipient)
router.post('/conversations/:otherUserId/read', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const otherUserId = req.params.otherUserId;
    if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      res.status(400).json({ error: 'Valid other user ID is required' });
      return;
    }

    await PrivateMessage.updateMany(
      { recipientId: userId, senderId: otherUserId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking PM read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /block/:userId — add user to current user's block list
router.post('/block/:userId', auth, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const blockUserId = req.params.userId;
    if (!blockUserId || !mongoose.Types.ObjectId.isValid(blockUserId)) {
      res.status(400).json({ error: 'Valid user ID is required' });
      return;
    }
    if (blockUserId === String(currentUserId)) {
      res.status(400).json({ error: 'Cannot block yourself' });
      return;
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const list = user.blockedUserIds || [];
    const idToAdd = new mongoose.Types.ObjectId(blockUserId);
    if (list.some((id) => id.toString() === blockUserId)) {
      res.json({ success: true, alreadyBlocked: true });
      return;
    }
    user.blockedUserIds = [...list, idToAdd];
    await user.save();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /block/:userId — remove user from current user's block list
router.delete('/block/:userId', auth, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const blockUserId = req.params.userId;
    if (!blockUserId || !mongoose.Types.ObjectId.isValid(blockUserId)) {
      res.status(400).json({ error: 'Valid user ID is required' });
      return;
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const list = user.blockedUserIds || [];
    user.blockedUserIds = list.filter((id) => id.toString() !== blockUserId);
    await user.save();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
