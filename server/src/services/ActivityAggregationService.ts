import { UserActivitySummary } from '../models/UserActivitySummary';

interface ActivityData {
  userId: string;
  ipAddress: string;
  deviceId: string;
  userAgent: string;
  endpoint: string;
  timestamp: Date;
}

export class ActivityAggregationService {
  private static activityBuffer: Map<string, ActivityData[]> = new Map();
  private static flushInterval: NodeJS.Timeout | null = null;
  private static readonly FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_BUFFER_SIZE = 1000; // Max items before forced flush

  static startAggregationService(): void {
    if (this.flushInterval) {
      console.log('⚠️ Activity aggregation service already running');
      return;
    }
    
    console.log('🚀 Starting activity aggregation service');
    console.log(`⏰ Flush interval: ${this.FLUSH_INTERVAL_MS / (1000 * 60)} minutes`);
    
    // Flush buffer every 5 minutes
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, this.FLUSH_INTERVAL_MS);
  }

  static stopAggregationService(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      console.log('🛑 Stopped activity aggregation service');
    }
  }

  static addActivity(activityData: ActivityData): void {
    const key = `${activityData.userId}-${this.getDateKey(activityData.timestamp)}`;
    
    if (!this.activityBuffer.has(key)) {
      this.activityBuffer.set(key, []);
    }
    
    this.activityBuffer.get(key)!.push(activityData);
    
    // Force flush if buffer gets too large
    if (this.activityBuffer.get(key)!.length >= this.MAX_BUFFER_SIZE) {
      this.flushBuffer();
    }
  }

  private static getDateKey(timestamp: Date): string {
    return timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private static async flushBuffer(): Promise<void> {
    if (this.activityBuffer.size === 0) {
      return;
    }

    console.log(`🔄 Flushing activity buffer with ${this.activityBuffer.size} daily summaries`);
    
    try {
      for (const [key, activities] of this.activityBuffer.entries()) {
        if (activities.length === 0) continue;
        
        const [userId, dateKey] = key.split('-');
        const firstActivity = activities[0];
        const lastActivity = activities[activities.length - 1];
        
        // Get unique endpoints
        const uniqueEndpoints = [...new Set(activities.map(a => a.endpoint))];
        
        // Update or create daily summary
        await UserActivitySummary.findOneAndUpdate(
          { userId, date: dateKey },
          {
            $set: {
              ipAddress: firstActivity.ipAddress,
              deviceId: firstActivity.deviceId,
              userAgent: firstActivity.userAgent,
              lastActivity: lastActivity.timestamp
            },
            $inc: { totalRequests: activities.length },
            $addToSet: { uniqueEndpoints: { $each: uniqueEndpoints } }
          },
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true 
          }
        );
      }
      
      // Clear buffer after successful flush
      this.activityBuffer.clear();
      console.log('✅ Activity buffer flushed successfully');
      
    } catch (error) {
      console.error('❌ Error flushing activity buffer:', error);
    }
  }

  static async getActivitySummary(userId: string, days: number = 30): Promise<any[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const summaries = await UserActivitySummary.find({
        userId,
        date: { $gte: cutoffDate.toISOString().split('T')[0] }
      }).sort({ date: -1 });
      
      return summaries;
    } catch (error) {
      console.error('❌ Error getting activity summary:', error);
      return [];
    }
  }

  static async getSystemStats(): Promise<{
    totalSummaries: number;
    totalUsers: number;
    averageDailyRequests: number;
  }> {
    try {
      const [totalSummaries, totalUsers, avgRequests] = await Promise.all([
        UserActivitySummary.countDocuments(),
        UserActivitySummary.distinct('userId').then(users => users.length),
        UserActivitySummary.aggregate([
          { $group: { _id: null, avgRequests: { $avg: '$totalRequests' } } }
        ]).then(result => result[0]?.avgRequests || 0)
      ]);
      
      return {
        totalSummaries,
        totalUsers,
        averageDailyRequests: Math.round(avgRequests)
      };
    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      return { totalSummaries: 0, totalUsers: 0, averageDailyRequests: 0 };
    }
  }

  // Force flush for testing or shutdown
  static async forceFlush(): Promise<void> {
    console.log('🔧 Force flushing activity buffer');
    await this.flushBuffer();
  }
}
