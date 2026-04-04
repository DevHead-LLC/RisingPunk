/**
 * Stable thread identity for private messages — shared by both participants (same string in DB).
 * Used by PrivateInboxThread.canonicalThreadKey and message queries.
 */

import mongoose from 'mongoose';

export type LeanPmForKey = {
  senderId: mongoose.Types.ObjectId | string;
  recipientId: mongoose.Types.ObjectId | string;
  isAdminBroadcast?: boolean;
};

/** Admin send-all / broadcast row: one channel per (admin, recipient). */
export function canonicalThreadKeyFromMessage(doc: LeanPmForKey): string {
  if (doc.isAdminBroadcast === true) {
    const s = String(doc.senderId);
    const r = String(doc.recipientId);
    return `bc:${s}:${r}`;
  }
  const a = String(doc.senderId);
  const b = String(doc.recipientId);
  return a < b ? `dm:${a}:${b}` : `dm:${b}:${a}`;
}

export function parseCanonicalThreadKey(key: string):
  | { kind: 'dm'; left: string; right: string }
  | { kind: 'bc'; senderId: string; recipientId: string }
  | null {
  if (key.startsWith('bc:')) {
    const rest = key.slice(3);
    const idx = rest.indexOf(':');
    if (idx <= 0) return null;
    const senderId = rest.slice(0, idx);
    const recipientId = rest.slice(idx + 1);
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(recipientId)) return null;
    return { kind: 'bc', senderId, recipientId };
  }
  if (key.startsWith('dm:')) {
    const rest = key.slice(3);
    const idx = rest.indexOf(':');
    if (idx <= 0) return null;
    const left = rest.slice(0, idx);
    const right = rest.slice(idx + 1);
    if (!mongoose.Types.ObjectId.isValid(left) || !mongoose.Types.ObjectId.isValid(right)) return null;
    return { kind: 'dm', left, right };
  }
  return null;
}

/** The other participant for inbox display (otherUserId param to existing APIs). */
export function otherParticipantIdForViewer(viewerId: string, canonicalKey: string): string {
  const p = parseCanonicalThreadKey(canonicalKey);
  if (!p) throw new Error('Invalid canonicalThreadKey');
  if (p.kind === 'bc') {
    return viewerId === p.recipientId ? p.senderId : p.recipientId;
  }
  return viewerId === p.left ? p.right : p.left;
}

/** Mongo filter for all PrivateMessage docs in this thread. */
export function threadMessagesFilter(canonicalKey: string): Record<string, unknown> {
  const p = parseCanonicalThreadKey(canonicalKey);
  if (!p) throw new Error('Invalid canonicalThreadKey');
  if (p.kind === 'bc') {
    return {
      senderId: new mongoose.Types.ObjectId(p.senderId),
      recipientId: new mongoose.Types.ObjectId(p.recipientId),
      isAdminBroadcast: true,
    };
  }
  const a = new mongoose.Types.ObjectId(p.left);
  const b = new mongoose.Types.ObjectId(p.right);
  return {
    $or: [
      { senderId: a, recipientId: b },
      { senderId: b, recipientId: a },
    ],
    $nor: [{ isAdminBroadcast: true }],
  };
}

/** Build canonical key from API params (open thread / delete) — must match stored keys. */
export function canonicalThreadKeyFromRoute(
  viewerId: string,
  otherUserId: string,
  broadcastOnly: boolean
): string {
  if (broadcastOnly) {
    return `bc:${otherUserId}:${viewerId}`;
  }
  const a = viewerId;
  const b = otherUserId;
  return a < b ? `dm:${a}:${b}` : `dm:${b}:${a}`;
}
