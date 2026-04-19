import mongoose from 'mongoose';

/**
 * Reserved system sender IDs for DMs that are not from a real user.
 * These ObjectIds are never used as a User._id; they identify the "sender" for
 * system-generated messages (e.g. Probe Report). No fake user account is required.
 */
export const PROBE_REPORT_SENDER_ID: mongoose.Types.ObjectId =
  new mongoose.Types.ObjectId('000000000000000000000001');

export const PROBE_REPORT_SENDER_USERNAME = 'Probe Report';

/** System sender for battle result DMs (PvP hack attack notifications). */
export const BATTLE_REPORT_SENDER_ID: mongoose.Types.ObjectId =
  new mongoose.Types.ObjectId('000000000000000000000002');

export const BATTLE_REPORT_SENDER_USERNAME = 'Battle Report';

/** System DMs (crew policy, etc.); same PM mechanics as Probe/Battle reports. */
export const SYSTEM_NOTIFICATION_SENDER_ID: mongoose.Types.ObjectId =
  new mongoose.Types.ObjectId('000000000000000000000003');

export const SYSTEM_NOTIFICATION_SENDER_USERNAME = 'System Notification';
