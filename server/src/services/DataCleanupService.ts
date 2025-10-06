import { UserActivityLog } from '../models/UserActivityLog';
import { User } from '../models/User';

export class DataCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly RETENTION_DAYS = 30;

  static async cleanupExpiredData(): Promise<void> {
    try {
      
      // Clean up expired user activity logs (older than 30 days)
      const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      const deleteResult = await UserActivityLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      if (deleteResult.deletedCount > 0) {
      } else {
      }
      
      // Clean up inactive users (inactive for 12 months as per privacy policy)
      const inactiveCutoffDate = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000);
      
      const inactiveUsers = await User.find({
        updatedAt: { $lt: inactiveCutoffDate },
        // Don't delete users who have been active recently
        // This is a safety check to prevent accidental deletion
      });
      
      if (inactiveUsers.length > 0) {
        
        // Log inactive users for manual review
        for (const user of inactiveUsers) {
        }
      }
      
    } catch (error) {
      console.error('Data cleanup error:', error);
    }
  }

  static async getDataRetentionStats(): Promise<{
    totalActivityLogs: number;
    logsOlderThan30Days: number;
    totalUsers: number;
    potentiallyInactiveUsers: number;
  }> {
    try {
      const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const inactiveCutoffDate = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000);
      
      const [totalActivityLogs, logsOlderThan30Days, totalUsers, potentiallyInactiveUsers] = await Promise.all([
        UserActivityLog.countDocuments(),
        UserActivityLog.countDocuments({ timestamp: { $lt: cutoffDate } }),
        User.countDocuments(),
        User.countDocuments({ updatedAt: { $lt: inactiveCutoffDate } })
      ]);
      
      return {
        totalActivityLogs,
        logsOlderThan30Days,
        totalUsers,
        potentiallyInactiveUsers
      };
    } catch (error) {
      console.error('Error getting data retention stats:', error);
      throw error;
    }
  }

  static startScheduledCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }
    
    
    // Run initial cleanup
    this.cleanupExpiredData();
    
    // Schedule recurring cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredData();
    }, this.CLEANUP_INTERVAL_MS);
  }

  static stopScheduledCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  static async manualCleanup(): Promise<void> {
    await this.cleanupExpiredData();
  }
}
