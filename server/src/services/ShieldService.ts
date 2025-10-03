import { User } from '../models/User';

export class ShieldService {
  /**
   * Checks and updates shield status for a single user
   * Returns the current active status after checking for expiry
   */
  static async checkAndUpdateShieldStatus(user: any): Promise<boolean> {
    const now = new Date();
    
    // Check if shield is active and should be completed
    if (user.antivirusShield?.active && user.antivirusShield?.startedAt && user.antivirusShield?.completesAt) {
      if (now >= user.antivirusShield.completesAt) {
        // Shield has expired, deactivate it
        user.antivirusShield.active = false;
        user.antivirusShield.startedAt = null;
        user.antivirusShield.completesAt = null;
        await user.save();
        return false;
      } else {
        // Shield is still active
        return true;
      }
    }
    
    return false;
  }

  /**
   * Checks and updates shield status for multiple users
   * Returns a map of userId to current shield status
   */
  static async checkAndUpdateMultipleShieldStatuses(users: any[]): Promise<Map<string, boolean>> {
    const shieldStatusMap = new Map<string, boolean>();
    const now = new Date();
    
    // Process all users in parallel
    const updatePromises = users.map(async (user) => {
      const isShielded = await this.checkAndUpdateShieldStatus(user);
      shieldStatusMap.set(String(user._id), isShielded);
    });
    
    await Promise.all(updatePromises);
    return shieldStatusMap;
  }

  /**
   * Gets current shield status for a user without modifying the database
   * This is useful for read-only operations where we don't want to trigger saves
   */
  static getCurrentShieldStatus(user: any): boolean {
    const now = new Date();
    
    if (user.antivirusShield?.active && user.antivirusShield?.startedAt && user.antivirusShield?.completesAt) {
      return now < user.antivirusShield.completesAt;
    }
    
    return false;
  }

  /**
   * Gets current shield status for multiple users without modifying the database
   */
  static getCurrentShieldStatuses(users: any[]): Map<string, boolean> {
    const shieldStatusMap = new Map<string, boolean>();
    const now = new Date();
    
    users.forEach((user) => {
      const isShielded = this.getCurrentShieldStatus(user);
      shieldStatusMap.set(String(user._id), isShielded);
    });
    
    return shieldStatusMap;
  }
}
