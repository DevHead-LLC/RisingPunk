import mongoose from 'mongoose';
import { PrivateMessage } from '../models/PrivateMessage';
import { applyRetentionAfterInsert } from './PrivateMessageRetentionService';
import {
  SYSTEM_NOTIFICATION_SENDER_ID,
  SYSTEM_NOTIFICATION_SENDER_USERNAME,
} from '../constants/systemSenders';

const SYSTEM_NOTIFICATION_PREFIX = 'SYS|';
const MAX_MESSAGE_LENGTH = 600;

export async function sendSystemNotificationDm(recipientId: string, body: string): Promise<void> {
  const messageBody = SYSTEM_NOTIFICATION_PREFIX + JSON.stringify({ m: body });
  if (messageBody.length > MAX_MESSAGE_LENGTH) {
    throw new Error('System notification message too long');
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
