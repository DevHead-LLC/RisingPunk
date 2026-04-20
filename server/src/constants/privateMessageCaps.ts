/** Per-user visible thread count (inbox list); shared per-thread message cap (storage). */
export const MAX_PM_THREADS = 10;
export const MAX_PM_MESSAGES_PER_THREAD = 20;

/**
 * Enforced only on POST `/api/private-messages/conversations/:recipientId/messages` (user ↔ user chat).
 * System PMs (battle/probe/system sender IDs, admin broadcast) are not limited by this — see `PrivateMessage` schema.
 */
export const USER_DM_MAX_MESSAGE_LENGTH = 500;
