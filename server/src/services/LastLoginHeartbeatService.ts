import { User } from '../models/User';

const LAST_LOGIN_HEARTBEAT_MS = 15 * 60 * 1000;

export async function bumpLastLoginAtIfStale(userId: string, currentLastLoginAt?: Date | null): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - LAST_LOGIN_HEARTBEAT_MS);
  if (currentLastLoginAt instanceof Date && currentLastLoginAt.getTime() > cutoff.getTime()) {
    return;
  }

  await User.updateOne(
    {
      _id: userId,
      $or: [
        { lastLoginAt: { $exists: false } },
        { lastLoginAt: null },
        { lastLoginAt: { $lte: cutoff } }
      ]
    },
    { $set: { lastLoginAt: now } }
  );
}
