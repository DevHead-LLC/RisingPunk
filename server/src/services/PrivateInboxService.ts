/**
 * Per-user private inbox: at most MAX_PM_THREADS rows per user (FIFO eviction deletes oldest row).
 * When no participant has an inbox row for a canonical thread, PrivateMessage rows for that thread are purged.
 */

import mongoose from 'mongoose';
import { PrivateMessage } from '../models/PrivateMessage';
import { PrivateInboxThread } from '../models/PrivateInboxThread';
import { User } from '../models/User';
import {
  BATTLE_REPORT_SENDER_ID,
  PROBE_REPORT_SENDER_ID,
  SYSTEM_NOTIFICATION_SENDER_ID,
} from '../constants/systemSenders';
import {
  canonicalThreadKeyFromMessage,
  canonicalThreadKeyFromRoute,
  otherParticipantIdForViewer,
  parseCanonicalThreadKey,
  threadMessagesFilter,
} from '../utils/privateThreadCanonicalKey';
import { MAX_PM_THREADS } from '../constants/privateMessageCaps';
import {
  extractBattleIdFromBtlPayload,
  tryDeleteBattleReplayIfUnreferenced,
} from './BattleReplayLifecycleService';

const SYSTEM_PM_SENDER_IDS = new Set([
  PROBE_REPORT_SENDER_ID.toString(),
  BATTLE_REPORT_SENDER_ID.toString(),
  SYSTEM_NOTIFICATION_SENDER_ID.toString(),
]);

type LeanPm = {
  senderId: mongoose.Types.ObjectId | string;
  recipientId: mongoose.Types.ObjectId | string;
  isAdminBroadcast?: boolean;
  createdAt?: Date;
};

function viewerBelongsOnInboxKey(viewerIdStr: string, canonicalThreadKey: string): boolean {
  if (SYSTEM_PM_SENDER_IDS.has(viewerIdStr)) return false;
  const parsed = parseCanonicalThreadKey(canonicalThreadKey);
  if (!parsed) return false;
  if (parsed.kind === 'bc') return parsed.recipientId === viewerIdStr;
  const { left, right } = parsed;
  const sysL = SYSTEM_PM_SENDER_IDS.has(left);
  const sysR = SYSTEM_PM_SENDER_IDS.has(right);
  if (sysL || sysR) {
    const human = sysL ? right : left;
    return human === viewerIdStr;
  }
  return left === viewerIdStr || right === viewerIdStr;
}

async function upsertInboxEntry(
  userIdStr: string,
  canonicalThreadKey: string,
  lastActivityAt: Date
): Promise<void> {
  if (SYSTEM_PM_SENDER_IDS.has(userIdStr)) return;
  if (!viewerBelongsOnInboxKey(userIdStr, canonicalThreadKey)) return;
  await PrivateInboxThread.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userIdStr), canonicalThreadKey },
    { $set: { lastActivityAt, dismissed: false } },
    { upsert: true }
  );
}

async function purgePrivateMessagesForThread(canonicalThreadKey: string): Promise<void> {
  const filter = threadMessagesFilter(canonicalThreadKey);
  const msgs = await PrivateMessage.find(filter as any).select('message').lean();
  const battleIds = new Set<string>();
  for (const m of msgs) {
    const bid = extractBattleIdFromBtlPayload((m as { message?: string }).message);
    if (bid) battleIds.add(bid);
  }
  await PrivateMessage.deleteMany(filter as any);
  for (const bid of battleIds) {
    await tryDeleteBattleReplayIfUnreferenced(bid);
  }
}

/**
 * If no human participant still has an inbox slot for this thread, delete all messages and any leftover inbox rows.
 */
export async function tryPurgeThreadIfUnreferenced(canonicalThreadKey: string): Promise<void> {
  const parsed = parseCanonicalThreadKey(canonicalThreadKey);
  if (!parsed) return;

  if (parsed.kind === 'bc') {
    const has = await PrivateInboxThread.exists({
      userId: new mongoose.Types.ObjectId(parsed.recipientId),
      canonicalThreadKey,
    });
    if (!has) {
      await purgePrivateMessagesForThread(canonicalThreadKey);
      await PrivateInboxThread.deleteMany({ canonicalThreadKey });
    }
    return;
  }

  const { left, right } = parsed;
  const sysLeft = SYSTEM_PM_SENDER_IDS.has(left);
  const sysRight = SYSTEM_PM_SENDER_IDS.has(right);

  if (sysLeft || sysRight) {
    const human = sysLeft ? right : left;
    const has = await PrivateInboxThread.exists({
      userId: new mongoose.Types.ObjectId(human),
      canonicalThreadKey,
    });
    if (!has) {
      await purgePrivateMessagesForThread(canonicalThreadKey);
      await PrivateInboxThread.deleteMany({ canonicalThreadKey });
    }
    return;
  }

  const [hasA, hasB] = await Promise.all([
    PrivateInboxThread.exists({ userId: new mongoose.Types.ObjectId(left), canonicalThreadKey }),
    PrivateInboxThread.exists({ userId: new mongoose.Types.ObjectId(right), canonicalThreadKey }),
  ]);
  if (!hasA && !hasB) {
    await purgePrivateMessagesForThread(canonicalThreadKey);
    await PrivateInboxThread.deleteMany({ canonicalThreadKey });
  }
}

/** Keep at most MAX_PM_THREADS inbox rows: drop oldest by lastActivityAt and try purge for each dropped thread. */
export async function enforceMaxInboxSlotsForUser(userIdStr: string): Promise<void> {
  if (SYSTEM_PM_SENDER_IDS.has(userIdStr)) return;
  const uid = new mongoose.Types.ObjectId(userIdStr);
  await PrivateInboxThread.deleteMany({ userId: uid, dismissed: true });

  while (true) {
    const count = await PrivateInboxThread.countDocuments({ userId: uid });
    if (count <= MAX_PM_THREADS) return;
    const oldest = await PrivateInboxThread.findOne({ userId: uid })
      .sort({ lastActivityAt: 1 })
      .select('canonicalThreadKey')
      .lean();
    if (!oldest) return;
    await PrivateInboxThread.deleteOne({
      userId: uid,
      canonicalThreadKey: oldest.canonicalThreadKey,
    });
    await tryPurgeThreadIfUnreferenced(oldest.canonicalThreadKey);
  }
}

/** Call after every new PrivateMessage row (or lean doc). */
export async function upsertInboxFromNewMessage(doc: LeanPm): Promise<void> {
  const key = canonicalThreadKeyFromMessage(doc);
  const lastAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
  if (doc.isAdminBroadcast === true) {
    await upsertInboxEntry(String(doc.recipientId), key, lastAt);
    await enforceMaxInboxSlotsForUser(String(doc.recipientId));
    await tryPurgeThreadIfUnreferenced(key);
    return;
  }
  await upsertInboxEntry(String(doc.senderId), key, lastAt);
  await upsertInboxEntry(String(doc.recipientId), key, lastAt);
  await enforceMaxInboxSlotsForUser(String(doc.senderId));
  await enforceMaxInboxSlotsForUser(String(doc.recipientId));
  await tryPurgeThreadIfUnreferenced(key);
}

export async function backfillPrivateInboxForUserIfNeeded(userId: string): Promise<void> {
  const uid = new mongoose.Types.ObjectId(userId);
  const activeCount = await PrivateInboxThread.countDocuments({ userId: uid, dismissed: false });
  if (activeCount > 0) return;
  await PrivateInboxThread.deleteMany({ userId: uid, dismissed: true });

  const hasPm = await PrivateMessage.exists({ $or: [{ senderId: uid }, { recipientId: uid }] });
  if (!hasPm) return;

  const keyToLast = new Map<string, Date>();
  const cursor = PrivateMessage.find({ $or: [{ senderId: uid }, { recipientId: uid }] })
    .select('senderId recipientId isAdminBroadcast createdAt')
    .lean()
    .cursor();
  for await (const d of cursor) {
    const lean: LeanPm = {
      senderId: d.senderId,
      recipientId: d.recipientId,
      isAdminBroadcast: d.isAdminBroadcast,
      createdAt: d.createdAt,
    };
    const key = canonicalThreadKeyFromMessage(lean);
    const t = lean.createdAt ? new Date(lean.createdAt) : new Date();
    const prev = keyToLast.get(key);
    if (!prev || t > prev) keyToLast.set(key, t);
  }

  for (const [key, lastAt] of keyToLast) {
    await upsertInboxEntry(userId, key, lastAt);
  }
  await enforceMaxInboxSlotsForUser(userId);
}

export async function dismissThreadForUser(
  viewerId: string,
  otherUserId: string,
  broadcastOnly: boolean
): Promise<void> {
  const key = canonicalThreadKeyFromRoute(viewerId, otherUserId, broadcastOnly);
  await PrivateInboxThread.deleteOne({
    userId: new mongoose.Types.ObjectId(viewerId),
    canonicalThreadKey: key,
  });
  await tryPurgeThreadIfUnreferenced(key);
}

/** Opening a thread revives the slot and may evict another thread for this user (FIFO). */
export async function touchInboxThreadOnOpen(
  viewerId: string,
  otherUserId: string,
  broadcastOnly: boolean
): Promise<void> {
  const key = canonicalThreadKeyFromRoute(viewerId, otherUserId, broadcastOnly);
  await PrivateInboxThread.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(viewerId), canonicalThreadKey: key },
    { $set: { lastActivityAt: new Date(), dismissed: false } },
    { upsert: true }
  );
  await enforceMaxInboxSlotsForUser(viewerId);
  await tryPurgeThreadIfUnreferenced(key);
}

export interface ConversationRowOut {
  otherUserId: string;
  otherUsername: string;
  lastMessage: string;
  lastAt: Date;
  unreadCount: number;
  isBroadcast: boolean;
}

/** Inbox list — at most MAX_PM_THREADS rows per user after enforcement. */
export async function listConversationsForUser(
  userId: string,
  opts: {
    blockedObjectIds: mongoose.Types.ObjectId[];
    adminIdSet: Set<string>;
    probeReportSenderIdStr: string;
    battleReportSenderIdStr: string;
    systemNotificationSenderIdStr: string;
    conversationListLastMessagePreview: (raw: string | undefined, isProbe: boolean) => string;
    getBattleReportPreview: (raw: string | undefined, currentUserId: string) => string;
    getSystemNotificationPreview: (raw: string | undefined) => string;
  }
): Promise<ConversationRowOut[]> {
  await backfillPrivateInboxForUserIfNeeded(userId);

  const userIdObj = new mongoose.Types.ObjectId(userId);
  const blockedSet = new Set(opts.blockedObjectIds.map((id) => id.toString()));

  const entries = await PrivateInboxThread.find({
    userId: userIdObj,
    dismissed: false,
  })
    .sort({ lastActivityAt: -1 })
    .limit(MAX_PM_THREADS)
    .lean();

  const out: ConversationRowOut[] = [];

  for (const ent of entries) {
    const key = ent.canonicalThreadKey;
    let otherId: string;
    try {
      otherId = otherParticipantIdForViewer(userId, key);
    } catch {
      continue;
    }

    const isBcKey = key.startsWith('bc:');
    const isProbe = otherId === opts.probeReportSenderIdStr;
    const isBattle = otherId === opts.battleReportSenderIdStr;
    const isSystemNotification = otherId === opts.systemNotificationSenderIdStr;
    if (blockedSet.has(otherId) && !isBcKey) continue;

    const filter = threadMessagesFilter(key) as any;
    const latest = await PrivateMessage.findOne(filter).sort({ createdAt: -1 }).lean();
    if (!latest) {
      await PrivateInboxThread.deleteOne({ userId: userIdObj, canonicalThreadKey: key });
      await tryPurgeThreadIfUnreferenced(key);
      continue;
    }

    const unreadCount = await PrivateMessage.countDocuments({
      ...filter,
      recipientId: userIdObj,
      readAt: null,
    } as any);

    const other =
      isProbe || isBattle || isSystemNotification
        ? null
        : await User.findById(new mongoose.Types.ObjectId(otherId)).select('handle').lean();

    const rawLast = latest.message as string | undefined;
    let lastMessage = rawLast ?? '';
    if (isBattle) {
      lastMessage = opts.getBattleReportPreview(rawLast, userId);
    } else if (isProbe) {
      lastMessage = opts.conversationListLastMessagePreview(rawLast, true);
    } else if (isSystemNotification) {
      lastMessage = opts.getSystemNotificationPreview(rawLast);
    }

    const announcements = isBcKey;
    const otherUsername = announcements
      ? 'RisingPunk (Announcements)'
      : isProbe
        ? 'Probe Report'
        : isBattle
          ? 'Battle Report'
          : isSystemNotification
            ? 'System Notification'
            : (other as any)?.handle ?? 'Unknown';

    out.push({
      otherUserId: otherId,
      otherUsername,
      lastMessage,
      lastAt: latest.createdAt ? new Date(latest.createdAt) : new Date(),
      unreadCount,
      isBroadcast: announcements || isProbe || isBattle || isSystemNotification,
    });
  }

  return out;
}
