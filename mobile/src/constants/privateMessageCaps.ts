/**
 * User ↔ user DM composer (`POST /api/private-messages/conversations/:id/messages`).
 * Must match `USER_DM_MAX_MESSAGE_LENGTH` in `server/src/constants/privateMessageCaps.ts`.
 */
export const USER_DM_MAX_MESSAGE_LENGTH = 500;

/**
 * Admin "message all" body — must match `ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH` in
 * `server/src/constants/privateMessageCaps.ts` (enforced on POST `.../admin/send-all`).
 */
export const ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH = 100_000;
