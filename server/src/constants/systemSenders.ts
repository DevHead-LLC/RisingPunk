import mongoose from 'mongoose';

/**
 * Reserved system sender IDs for DMs that are not from a real user.
 * These ObjectIds are never used as a User._id; they identify the "sender" for
 * system-generated messages (e.g. Probe Report). No fake user account is required.
 */
export const PROBE_REPORT_SENDER_ID: mongoose.Types.ObjectId =
  new mongoose.Types.ObjectId('000000000000000000000001');

export const PROBE_REPORT_SENDER_USERNAME = 'Probe Report';
