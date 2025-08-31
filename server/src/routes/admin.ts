import { Router, Request, Response } from 'express';
import { DataCleanupService } from '../services/DataCleanupService';
import { ActivityAggregationService } from '../services/ActivityAggregationService';
import { User } from '../models/User';

const router = Router();

// Get data retention statistics
router.get('/data-retention-stats', async (req: Request, res: Response) => {
  try {
    const stats = await DataCleanupService.getDataRetentionStats();
    const { ActivityAggregationService } = require('../services/ActivityAggregationService');
    const aggregationStats = await ActivityAggregationService.getSystemStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        aggregationStats,
        retentionPolicy: {
          activitySummaries: '30 days',
          inactiveUsers: '12 months',
          lastCleanup: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting data retention stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get data retention statistics' 
    });
  }
});

// Trigger manual data cleanup
router.post('/data-cleanup', async (req: Request, res: Response) => {
  try {
    await DataCleanupService.manualCleanup();
    
    res.json({
      success: true,
      message: 'Data cleanup completed successfully'
    });
  } catch (error) {
    console.error('❌ Error during manual data cleanup:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete data cleanup' 
    });
  }
});

// Get recent activity summaries (for admin review)
router.get('/recent-activity', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;
    
    const { ActivityAggregationService } = require('../services/ActivityAggregationService');
    const stats = await ActivityAggregationService.getSystemStats();
    
    // Get recent daily summaries
    const summaries = await require('../models/UserActivitySummary').find()
      .sort({ date: -1, lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    res.json({
      success: true,
      data: {
        summaries,
        systemStats: stats,
        pagination: {
          page,
          limit,
          total: stats.totalSummaries,
          pages: Math.ceil(stats.totalSummaries / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error getting recent activity summaries:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get activity summaries' 
    });
  }
});

// Get user activity summary
router.get('/user-activity-summary/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
      return;
    }
    
    const { ActivityAggregationService } = require('../services/ActivityAggregationService');
    const dailySummaries = await ActivityAggregationService.getActivitySummary(userId, 30);
    
    const activitySummary = {
      userId: user._id,
      handle: user.handle,
      totalDailySummaries: dailySummaries.length,
      totalRequests: dailySummaries.reduce((sum: number, s: any) => sum + s.totalRequests, 0),
      uniqueEndpoints: [...new Set(dailySummaries.flatMap((s: any) => s.uniqueEndpoints))],
      recentActivity: dailySummaries.slice(0, 10),
      lastActivity: dailySummaries[0]?.lastActivity || null,
      dataRetention: {
        willExpireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 30
      }
    };
    
    res.json({
      success: true,
      data: activitySummary
    });
  } catch (error) {
    console.error('❌ Error getting user activity summary:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user activity summary' 
    });
  }
});

export default router;
