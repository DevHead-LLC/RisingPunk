/** Per-user visible thread count (inbox list); shared per-thread message cap (storage). */
export const MAX_PM_THREADS = 10;
export const MAX_PM_MESSAGES_PER_THREAD = 20;

/**
 * Enforced only on POST `/api/private-messages/conversations/:recipientId/messages` (user ↔ user chat).
 * System PMs (battle/probe/system sender IDs) are not limited by this — see `PrivateMessage` schema.
 */
export const USER_DM_MAX_MESSAGE_LENGTH = 500;

/** Must match `ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH` in `mobile/src/constants/privateMessageCaps.ts`. */
export const ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH = 100_000;
