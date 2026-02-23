import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth';
import { User } from '../models/User';
import { PrivateMessage, getConversationKey, ADMIN_BROADCAST_FOOTER } from '../models/PrivateMessage';
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

/** 24-char hex MongoDB ObjectId (optional :broadcast suffix for conversation key). */
const VALID_CONVERSATION_KEY = /^[a-f0-9]{24}(:broadcast)?$/i;

function getConversationKeyString(row: any): string {
  const raw = row._id;
  if (raw == null) return '';
  let s: string;
  if (typeof raw === 'string') s = raw;
  else if (typeof (raw as any).toString === 'function') s = (raw as any).toString();
  else s = String(raw);
  return s.trim();
}

// GET /conversations — list conversations; admin broadcast is a separate "Announcements" thread so 1-on-1 stays separate
router.get('/conversations', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userIdStr = String(userId);
    const userIdObj = typeof userId === 'string'
      ? new mongoose.Types.ObjectId(userId)
      : (userId as mongoose.Types.ObjectId);

    const rawCount = await PrivateMessage.countDocuments({
      $or: [{ senderId: userIdObj }, { recipientId: userIdObj }],
    });

    const user = await User.findById(userId).select('blockedUserIds').lean();
    const blockedList = (user?.blockedUserIds || []).map((id: unknown) => new mongoose.Types.ObjectId(String(id)));
    const adminIds = getAdminUserIds();
    const adminIdSet = new Set(adminIds.map((id) => id.toString()));

    const pipeline: any[] = [
      { $match: { $or: [{ senderId: userIdObj }, { recipientId: userIdObj }] } },
      { $addFields: {
        otherId: { $cond: [{ $eq: ['$senderId', userIdObj] }, '$recipientId', '$senderId'] },
        groupKey: {
          $cond: [
            // Admin sent broadcast to otherId → separate :broadcast thread (excluded from admin inbox)
            {
              $and: [
                { $eq: ['$senderId', userIdObj] },
                { $eq: ['$isAdminBroadcast', true] },
              ],
            },
            { $concat: [{ $toString: '$otherId' }, ':broadcast'] },
            {
              ['$cond']: [
                // Recipient view: broadcast from otherId (admin) → announcements thread
                {
                  $and: [
                    { $eq: ['$senderId', '$otherId'] },
                    { $eq: ['$isAdminBroadcast', true] },
                  ],
                },
                { $concat: [{ $toString: '$otherId' }, ':broadcast'] },
                { $toString: '$otherId' },
              ],
            },
          ],
        },
      } },
      ...(blockedList.length > 0 ? [{ $match: { otherId: { $nin: blockedList } } }] : []),
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: { $toString: '$groupKey' },
        lastMessage: { $first: '$message' },
        lastAt: { $first: '$createdAt' },
        lastSenderId: { $first: '$senderId' },
        lastIsAdminBroadcast: { $first: '$isAdminBroadcast' },
        unreadCount: { $sum: { $cond: [
          { $and: [{ $eq: ['$recipientId', userIdObj] }, { $eq: ['$readAt', null] }] },
          1,
          0,
        ] } },
      } },
      { $sort: { lastAt: -1 } },
      { $limit: 10 },
    ];
    let aggregated = await PrivateMessage.aggregate(pipeline);

    async function runFallback(): Promise<typeof aggregated> {
      const fallbackDocs = await PrivateMessage.find({
        $or: [{ senderId: userIdObj }, { recipientId: userIdObj }],
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      const blockedSet = new Set(blockedList.map((id) => id.toString()));
      const groupMap = new Map<
        string,
        { lastMessage: string; lastAt: Date; lastSenderId: unknown; lastIsAdminBroadcast: boolean; unreadCount: number }
      >();
      for (const doc of fallbackDocs as any[]) {
        const otherId =
          String(doc.senderId) === String(userId) ? doc.recipientId : doc.senderId;
        const otherIdStr = String(otherId);
        if (blockedSet.has(otherIdStr)) continue;
        // Broadcast thread: either current user received broadcast from otherId, or current user (admin) sent broadcast to otherId
        const isBroadcast =
          doc.isAdminBroadcast === true &&
          (String(doc.senderId) === otherIdStr || String(doc.senderId) === String(userId));
        const groupKey = isBroadcast ? `${otherIdStr}:broadcast` : otherIdStr;
        const isUnread =
          doc.recipientId && String(doc.recipientId) === String(userId) && !doc.readAt;
        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, {
            lastMessage: doc.message,
            lastAt: doc.createdAt,
            lastSenderId: doc.senderId,
            lastIsAdminBroadcast: !!doc.isAdminBroadcast,
            unreadCount: isUnread ? 1 : 0,
          });
        } else {
          const g = groupMap.get(groupKey)!;
          if (isUnread) g.unreadCount += 1;
        }
      }
      return Array.from(groupMap.entries())
        .map(([_id, g]) => ({
          _id,
          lastMessage: g.lastMessage,
          lastAt: g.lastAt,
          lastSenderId: g.lastSenderId,
          lastIsAdminBroadcast: g.lastIsAdminBroadcast,
          unreadCount: g.unreadCount,
        }))
        .sort((a, b) => new Date((b as any).lastAt).getTime() - new Date((a as any).lastAt).getTime())
        .slice(0, 10);
    }

    if (aggregated.length === 0) {
      aggregated = await runFallback();
    }

    const currentUserStr = userIdStr;
    const isCurrentUserAdmin = adminIdSet.has(currentUserStr);

    let filtered = aggregated.filter((row: any) => {
      const key = getConversationKeyString(row);
      const isBroadcast = key.endsWith(':broadcast');
      const otherUserIdFromKey = isBroadcast ? key.slice(0, -':broadcast'.length) : key;
      if (!key || !VALID_CONVERSATION_KEY.test(key)) return false;
      if (isCurrentUserAdmin && isBroadcast) return false;
      return true;
    });

    // Aggregation can return _id as object (driver/BSON); fallback builds string _id so list displays
    if (filtered.length === 0 && rawCount > 0 && aggregated.length > 0) {
      aggregated = await runFallback();
      filtered = aggregated.filter((row: any) => {
        const key = getConversationKeyString(row);
        const isBroadcast = key.endsWith(':broadcast');
        if (!key || !VALID_CONVERSATION_KEY.test(key)) return false;
        if (isCurrentUserAdmin && isBroadcast) return false;
        return true;
      });
    }

    const withUsernames = await Promise.all(
      filtered
        .map(async (row: any) => {
          const key = getConversationKeyString(row);
          const keyIsBroadcast = key.endsWith(':broadcast');
          const otherUserIdFromKey = keyIsBroadcast ? key.slice(0, -':broadcast'.length) : key;
          const isBroadcast =
            keyIsBroadcast || (row.lastIsAdminBroadcast === true && adminIdSet.has(otherUserIdFromKey));
          const otherId = new mongoose.Types.ObjectId(otherUserIdFromKey);
          const other = await User.findById(otherId).select('handle').lean();
          return {
            otherUserId: otherUserIdFromKey,
            otherUsername: isBroadcast ? 'RisingPunk (Announcements)' : (other?.handle ?? 'Unknown'),
            lastMessage: row.lastMessage,
            lastAt: row.lastAt,
            unreadCount: row.unreadCount ?? 0,
            isBroadcast: !!isBroadcast,
          };
        }),
    );

    res.json({ success: true, conversations: withUsernames });
  } catch (error: any) {
    console.error('Error listing PM conversations:', error?.message ?? error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /conversations/:otherUserId/messages — get thread; ?broadcastOnly=true for announcements (no reply) only
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
    const broadcastOnly = req.query.broadcastOnly === 'true';

    const user = await User.findById(userId).select('blockedUserIds').lean();
    const blockedSet = new Set((user?.blockedUserIds || []).map((id: unknown) => String(id)));
    if (blockedSet.has(otherUserId)) {
      res.status(403).json({ error: 'Cannot view conversation with blocked user' });
      return;
    }

    const userIdObj = typeof userId === 'string'
      ? new mongoose.Types.ObjectId(userId)
      : (userId as mongoose.Types.ObjectId);
    const otherUserIdObj = new mongoose.Types.ObjectId(otherUserId);

    const THREAD_MESSAGE_LIMIT = 20;
    const query = broadcastOnly
      ? {
          senderId: otherUserIdObj,
          recipientId: userIdObj,
          isAdminBroadcast: true,
        }
      : {
          $or: [
            { senderId: userIdObj, recipientId: otherUserIdObj },
            { senderId: otherUserIdObj, recipientId: userIdObj },
          ],
          $nor: [{ isAdminBroadcast: true }],
        };

    const messages = await PrivateMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(THREAD_MESSAGE_LIMIT)
      .lean();

    const chronological = [...messages].reverse();
    const formatted = chronological.map((msg: any) => ({
      id: String(msg._id),
      senderId: String(msg.senderId),
      recipientId: String(msg.recipientId),
      senderUsername: msg.senderUsername,
      message: msg.message,
      timestamp: msg.createdAt,
      readAt: msg.readAt,
      isFromAdmin: msg.isFromAdmin ?? false,
      isAdminBroadcast: msg.isAdminBroadcast ?? false,
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

// POST /admin/send-all — admin only: send one PM to every user (one-way, no reply; includes footer)
router.post('/admin/send-all', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const adminIds = getAdminUserIds();
    const isAdmin = adminIds.some((id) => id.toString() === String(userId));
    if (!isAdmin) {
      res.status(403).json({ error: 'Admin only' });
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

    const sender = await User.findById(userId).select('handle').lean();
    if (!sender) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const filteredBody = filterBadWords(trimmed);
    const fullMessage = `${filteredBody}\n\n${ADMIN_BROADCAST_FOOTER}`;

    const recipientUsers = await User.find({ _id: { $ne: userId } }).select('_id').lean();
    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : (userId as mongoose.Types.ObjectId);
    const docs = recipientUsers.map((u: any) => ({
      senderId: userIdObj,
      recipientId: u._id,
      senderUsername: sender.handle || 'RisingPunk',
      message: fullMessage,
      originalMessage: trimmed,
      readAt: null,
      isFromAdmin: true,
      isAdminBroadcast: true,
    }));
    if (docs.length > 0) {
      await PrivateMessage.insertMany(docs);
    }

    res.json({ success: true, sentCount: docs.length });
  } catch (error: any) {
    console.error('Error sending admin message to all:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /conversations/:otherUserId/read — mark as read; ?broadcastOnly=true for announcements thread
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
    const broadcastOnly = req.query.broadcastOnly === 'true';

    const filter: any = {
      recipientId: userId,
      senderId: new mongoose.Types.ObjectId(otherUserId),
      readAt: null,
    };
    if (broadcastOnly) {
      filter.isAdminBroadcast = true;
    } else {
      filter.$nor = [{ isAdminBroadcast: true }];
    }

    await PrivateMessage.updateMany(filter, { $set: { readAt: new Date() } });
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
