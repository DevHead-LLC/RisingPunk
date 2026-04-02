/**
 * FIFO retention for private messages: max threads per user and max messages per thread.
 * Admin outbound send-all threads do not count toward the admin's 10-thread cap (per product spec).
 */

import mongoose from 'mongoose';
import { PrivateMessage } from '../models/PrivateMessage';
import { MAX_PM_MESSAGES_PER_THREAD, MAX_PM_THREADS } from '../constants/privateMessageCaps';
import { upsertInboxFromNewMessage } from './PrivateInboxService';

export { MAX_PM_MESSAGES_PER_THREAD, MAX_PM_THREADS } from '../constants/privateMessageCaps';

type LeanPm = {
  senderId: mongoose.Types.ObjectId | string;
  recipientId: mongoose.Types.ObjectId | string;
  isAdminBroadcast?: boolean;
};

function threadFilterForDoc(doc: LeanPm): Record<string, unknown> {
  if (doc.isAdminBroadcast === true) {
    return {
      senderId: doc.senderId,
      recipientId: doc.recipientId,
      isAdminBroadcast: true,
    };
  }
  return {
    $or: [
      { senderId: doc.senderId, recipientId: doc.recipientId },
      { senderId: doc.recipientId, recipientId: doc.senderId },
    ],
    $nor: [{ isAdminBroadcast: true }],
  };
}

/** Delete oldest messages in this thread so at most MAX_PM_MESSAGES_PER_THREAD remain (newest kept). */
export async function trimThreadToMaxMessages(doc: LeanPm): Promise<void> {
  const filter = threadFilterForDoc(doc);
  const excess = await PrivateMessage.find(filter as any)
    .sort({ createdAt: -1 })
    .skip(MAX_PM_MESSAGES_PER_THREAD)
    .select('_id')
    .lean();
  if (excess.length === 0) return;
  await PrivateMessage.deleteMany({ _id: { $in: excess.map((x) => x._id) } });
}

/** After any PM insert: trim to 20 messages (shared thread storage); update per-user inbox rows. */
export async function applyRetentionAfterInsert(doc: LeanPm): Promise<void> {
  await trimThreadToMaxMessages(doc);
  await upsertInboxFromNewMessage(doc);
}

/**
 * After send-all: trim each admin→recipient channel; upsert recipient inbox only (admin send-all does not list for sender).
 */
export async function applyRetentionAfterAdminSendAll(
  adminUserId: string | mongoose.Types.ObjectId,
  recipientIds: string[]
): Promise<void> {
  const adminObj = new mongoose.Types.ObjectId(String(adminUserId));
  const seen = new Set<string>();
  const uniqRecipientIds: string[] = [];
  for (const rid of recipientIds) {
    if (!rid || seen.has(rid)) continue;
    seen.add(rid);
    if (!mongoose.Types.ObjectId.isValid(rid)) continue;
    uniqRecipientIds.push(rid);
  }
  await Promise.all(
    uniqRecipientIds.map(async (rid) => {
      const doc: LeanPm = {
        senderId: adminObj,
        recipientId: new mongoose.Types.ObjectId(rid),
        isAdminBroadcast: true,
      };
      await trimThreadToMaxMessages(doc);
      await upsertInboxFromNewMessage(doc);
    }),
  );
}
