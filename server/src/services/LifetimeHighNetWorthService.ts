import { IUser } from '../models/User';

/**
 * Service to track and update lifetime high net worth
 * Updates the lifetime high when current net worth exceeds it
 */
export class LifetimeHighNetWorthService {
  /**
   * Check if current net worth exceeds lifetime high and update if needed
   * Returns true if lifetime high was updated, false otherwise
   */
  static async checkAndUpdateLifetimeHigh(user: IUser): Promise<boolean> {
    const currentNetWorth = user.balance?.total || 0;
    const currentLifetimeHigh = user.lifetimeHighNetWorth || 0;

    // Only update if current net worth exceeds lifetime high
    if (currentNetWorth > currentLifetimeHigh) {
      user.lifetimeHighNetWorth = currentNetWorth;
      await user.save();
      return true;
    }

    return false;
  }

  /**
   * Initialize lifetime high for existing users who don't have it set
   * Sets it to current net worth if not already set
   */
  static async initializeLifetimeHigh(user: IUser): Promise<void> {
    if (user.lifetimeHighNetWorth === undefined || user.lifetimeHighNetWorth === null) {
      const currentNetWorth = user.balance?.total || 0;
      user.lifetimeHighNetWorth = currentNetWorth;
      await user.save();
    }
  }
}
