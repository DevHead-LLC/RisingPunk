import { User } from '../models/User';

export class ShieldService {
  /**
   * Checks and updates shield status for a single user
   * Returns the current active status after checking for expiry
   * Also updates the in-memory user object to prevent stale data issues
   */
  static async checkAndUpdateShieldStatus(user: any): Promise<boolean> {
    const now = new Date();
    
    // Check if shield is active and should be completed
    if (user.antivirusShield?.active && user.antivirusShield?.startedAt && user.antivirusShield?.completesAt) {
      if (now >= user.antivirusShield.completesAt) {
        // Shield has expired, deactivate it using updateOne to avoid schema validation issues
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              'antivirusShield.active': false,
              'antivirusShield.startedAt': null,
              'antivirusShield.completesAt': null
            }
          }
        );
        
        // Update the in-memory user object to prevent stale data issues
        user.antivirusShield.active = false;
        user.antivirusShield.startedAt = null;
        user.antivirusShield.completesAt = null;
        
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
    
    // Find users with expired shields
    const expiredUserIds: string[] = [];
    const activeUserIds: string[] = [];
    
    users.forEach((user) => {
      if (user.antivirusShield?.active && user.antivirusShield?.startedAt && user.antivirusShield?.completesAt) {
        if (now >= user.antivirusShield.completesAt) {
          expiredUserIds.push(String(user._id));
          shieldStatusMap.set(String(user._id), false);
        } else {
          activeUserIds.push(String(user._id));
          shieldStatusMap.set(String(user._id), true);
        }
      } else {
        shieldStatusMap.set(String(user._id), false);
      }
    });
    
    // Update all expired shields in a single operation
    if (expiredUserIds.length > 0) {
      await User.updateMany(
        { _id: { $in: expiredUserIds } },
        {
          $set: {
            'antivirusShield.active': false,
            'antivirusShield.startedAt': null,
            'antivirusShield.completesAt': null
          }
        }
      );
    }
    
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
