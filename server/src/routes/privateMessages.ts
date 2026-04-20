import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth';
import { User } from '../models/User';
import { PrivateMessage, ADMIN_BROADCAST_FOOTER } from '../models/PrivateMessage';
import { filterBadWords } from '../utils/contentModeration';
import { getAdminUserIds } from '../config/env';
import {
  PROBE_REPORT_SENDER_ID,
  PROBE_REPORT_SENDER_USERNAME,
  BATTLE_REPORT_SENDER_ID,
  BATTLE_REPORT_SENDER_USERNAME,
  SYSTEM_NOTIFICATION_SENDER_ID,
} from '../constants/systemSenders';
import {
  applyRetentionAfterAdminSendAll,
  applyRetentionAfterInsert,
} from '../services/PrivateMessageRetentionService';
import {
  ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH,
  MAX_PM_MESSAGES_PER_THREAD,
  USER_DM_MAX_MESSAGE_LENGTH,
} from '../constants/privateMessageCaps';
import { listConversationsForUser, dismissThreadForUser, touchInboxThreadOnOpen } from '../services/PrivateInboxService';
import '../models/PrivateInboxThread';

const router = express.Router();

/** Stored `message` = filtered body + `\\n\\n` + {@link ADMIN_BROADCAST_FOOTER} (filter preserves length). */
const ADMIN_BROADCAST_FULL_MESSAGE_MAX_LENGTH =
  ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH + 2 + ADMIN_BROADCAST_FOOTER.length;

const PROBE_REPORT_PREFIX = 'PRB|';
const BATTLE_REPORT_PREFIX = 'BTL|';
const SYSTEM_NOTIFICATION_PREFIX = 'SYS|';

/** Return a human-readable inbox preview for probe report messages; otherwise return the raw message. */
function conversationListLastMessagePreview(raw: string | undefined, isProbeReport: boolean): string {
  if (!isProbeReport || typeof raw !== 'string' || !raw.startsWith(PROBE_REPORT_PREFIX)) {
    return raw ?? '';
  }
  try {
    const payload = JSON.parse(raw.slice(PROBE_REPORT_PREFIX.length)) as { n?: string };
    if (payload?.n != null) return `Probe Report: ${payload.n}`;
  } catch (_) {
    // ignore
  }
  return 'Probe Report';
}

/** Return a human-readable inbox preview for battle report messages. */
function getBattleReportPreview(raw: string | undefined, currentUserId: string): string {
  if (typeof raw !== 'string' || !raw.startsWith(BATTLE_REPORT_PREFIX)) return raw ?? 'Battle Report';
  try {
    const payload = JSON.parse(raw.slice(BATTLE_REPORT_PREFIX.length)) as {
      attackerId?: string;
      defenderId?: string;
      attackerHandle?: string;
      defenderHandle?: string;
    };
    if (!payload) return 'Battle Report';
    const otherHandle =
      String(payload.attackerId) === String(currentUserId)
        ? payload.defenderHandle
        : payload.attackerHandle;
    return otherHandle != null ? `Battle Report: ${otherHandle}` : 'Battle Report';
  } catch (_) {
    // ignore
  }
  return 'Battle Report';
}

function getSystemNotificationPreview(raw: string | undefined): string {
  if (typeof raw !== 'string' || !raw.startsWith(SYSTEM_NOTIFICATION_PREFIX)) {
    return raw ?? '';
  }
  try {
    const payload = JSON.parse(raw.slice(SYSTEM_NOTIFICATION_PREFIX.length)) as { m?: string };
    if (payload?.m != null && typeof payload.m === 'string') {
      return payload.m.length > 120 ? `${payload.m.slice(0, 117)}…` : payload.m;
    }
  } catch (_) {
    // ignore
  }
  return 'System Notification';
}

const PM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PM_RATE_LIMIT_MAX = 10;
const pmRateLimit = new Map<string, { count: number; windowStartMs: number }>();

const THREAD_MESSAGE_LIMIT = MAX_PM_MESSAGES_PER_THREAD;

function evictExpiredPmRateLimit(nowMs: number): void {
  for (const [key, val] of pmRateLimit.entries()) {
    if (nowMs - val.windowStartMs >= PM_RATE_LIMIT_WINDOW_MS) {
      pmRateLimit.delete(key);
    }
  }
}

// GET /conversations — per-user inbox (PrivateInboxThread); top MAX_PM_THREADS by activity; no shared thread deletion
router.get('/conversations', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userIdStr = String(userId);

    const user = await User.findById(userId).select('blockedUserIds').lean();
    const adminIds = getAdminUserIds();
    const adminIdSet = new Set(adminIds.map((id) => id.toString()));
    const blockedList = (user?.blockedUserIds || [])
      .map((id: unknown) => new mongoose.Types.ObjectId(String(id)))
      .filter((id) => !adminIdSet.has(id.toString()));

    const rows = await listConversationsForUser(userIdStr, {
      blockedObjectIds: blockedList,
      adminIdSet,
      probeReportSenderIdStr: PROBE_REPORT_SENDER_ID.toString(),
      battleReportSenderIdStr: BATTLE_REPORT_SENDER_ID.toString(),
      systemNotificationSenderIdStr: SYSTEM_NOTIFICATION_SENDER_ID.toString(),
      conversationListLastMessagePreview,
      getBattleReportPreview,
      getSystemNotificationPreview,
    });

    const conversations = rows.map((row) => ({
      otherUserId: row.otherUserId,
      otherUsername: row.otherUsername,
      lastMessage: row.lastMessage,
      lastAt: row.lastAt.toISOString(),
      unreadCount: row.unreadCount,
      isBroadcast: row.isBroadcast,
    }));

    res.json({ success: true, conversations });
  } catch (error: any) {
    console.error('Error listing PM conversations:', error?.message ?? error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /conversations/:otherUserId — remove thread from this user's inbox; purge DB when both parties released (see PrivateInboxService)
router.delete('/conversations/:otherUserId', auth, async (req: Request, res: Response) => {
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
    await dismissThreadForUser(String(userId), otherUserId, broadcastOnly);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error dismissing PM conversation:', error?.message ?? error);
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
    const adminIds = getAdminUserIds();
    const adminIdSet = new Set(adminIds.map((id) => id.toString()));
    // blockedSet excludes admins so announcements thread (otherUserId = admin) always allowed
    const blockedSet = new Set(
      (user?.blockedUserIds || []).map((id: unknown) => String(id)).filter((id) => !adminIdSet.has(id)),
    );
    if (blockedSet.has(otherUserId)) {
      res.status(403).json({ error: 'Cannot view conversation with blocked user' });
      return;
    }

    const userIdObj = typeof userId === 'string'
      ? new mongoose.Types.ObjectId(userId)
      : (userId as mongoose.Types.ObjectId);
    const otherUserIdObj = new mongoose.Types.ObjectId(otherUserId);

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

    if (formatted.length > 0) {
      try {
        await touchInboxThreadOnOpen(String(userId), otherUserId, broadcastOnly);
      } catch (touchErr: any) {
        console.error('touch inbox on open:', touchErr?.message ?? touchErr);
      }
    }

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
    if (recipientId === String(userId)) {
      res.status(400).json({ error: 'Cannot send a message to yourself' });
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
    if (trimmed.length > USER_DM_MAX_MESSAGE_LENGTH) {
      res.status(400).json({
        error: `Message must be ${USER_DM_MAX_MESSAGE_LENGTH} characters or less`,
      });
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

    try {
      await applyRetentionAfterInsert(doc.toObject() as any);
    } catch (retentionErr: any) {
      console.error('PM retention after send:', retentionErr?.message ?? retentionErr);
    }

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
    if (trimmed.length > ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH) {
      res.status(400).json({
        error: `Message must be ${ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH} characters or less`,
      });
      return;
    }
    const filteredBody = filterBadWords(trimmed);
    const fullMessage = `${filteredBody}\n\n${ADMIN_BROADCAST_FOOTER}`;
    if (fullMessage.length > ADMIN_BROADCAST_FULL_MESSAGE_MAX_LENGTH) {
      res.status(400).json({ error: 'Message too long' });
      return;
    }

    const sender = await User.findById(userId).select('handle').lean();
    if (!sender) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

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
      try {
        await applyRetentionAfterAdminSendAll(
          userId,
          docs.map((d: { recipientId: mongoose.Types.ObjectId }) => String(d.recipientId)),
        );
      } catch (retentionErr: any) {
        console.error('PM retention after send-all:', retentionErr?.message ?? retentionErr);
      }
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
    const adminIds = getAdminUserIds();
    if (adminIds.some((id) => id.toString() === blockUserId)) {
      res.status(403).json({ error: 'Cannot block admin users' });
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
