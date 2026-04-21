import mongoose from 'mongoose';
import { PrivateMessage, PRIVATE_MESSAGE_MESSAGE_MAX_LENGTH } from '../models/PrivateMessage';
import { applyRetentionAfterInsert } from './PrivateMessageRetentionService';
import {
  SYSTEM_NOTIFICATION_SENDER_ID,
  SYSTEM_NOTIFICATION_SENDER_USERNAME,
} from '../constants/systemSenders';

const SYSTEM_NOTIFICATION_PREFIX = 'SYS|';

export async function sendSystemNotificationDm(recipientId: string, body: string): Promise<void> {
  const messageBody = SYSTEM_NOTIFICATION_PREFIX + JSON.stringify({ m: body });
  // Bugbot: fail fast with an explicit Error before `save()` — matches `PrivateMessage.message` maxlength (not a generic Mongoose validation message).
  if (messageBody.length > PRIVATE_MESSAGE_MESSAGE_MAX_LENGTH) {
    throw new Error(
      `System notification message too long: ${messageBody.length} characters (max ${PRIVATE_MESSAGE_MESSAGE_MAX_LENGTH} for stored PM body)`
    );
  }

  const doc = new PrivateMessage({
    senderId: SYSTEM_NOTIFICATION_SENDER_ID,
    recipientId: new mongoose.Types.ObjectId(recipientId),
    senderUsername: SYSTEM_NOTIFICATION_SENDER_USERNAME,
    message: messageBody,
    readAt: null,
    isFromAdmin: false,
  });
  await doc.save();

  try {
    await applyRetentionAfterInsert(doc.toObject() as any);
  } catch (re: any) {
    console.error('CrewSystemNotificationService: PM retention failed', re?.message ?? re);
  }
}
