import express from 'express';
const Bot = require('../models/Bot');
import auth from '../middleware/auth';

const router = express.Router();

// Assign bots to battalion
router.post('/assign', auth, async (req, res) => {
  try {
    const { botType, quantity, battalionId } = req.body;
    const userId = req.user._id;

    if (!botType || !battalionId || quantity === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user's bot inventory
    let userBots = await Bot.findOne({ userId });
    if (!userBots) {
      res.status(404).json({ error: 'Bot inventory not found' });
      return;
    }

    // Check if user has enough bots
    const availableBots = userBots.bots[botType] || 0;
    if (quantity > availableBots) {
      res.status(400).json({ error: 'Insufficient bots' });
      return;
    }

    // Remove or update existing assignment for this battalion
    userBots.battalionAssignments = userBots.battalionAssignments.filter(
      (assignment: any) => assignment.battalionId !== battalionId
    );

    // Add new assignment if quantity > 0
    if (quantity > 0) {
      userBots.battalionAssignments.push({
        battalionId,
        botType,
        quantity,
        markLevel: 1
      });
    }

    // Update bot counts
    const currentAssigned = userBots.battalionAssignments
      .filter((assignment: any) => assignment.botType === botType)
      .reduce((sum: number, assignment: any) => sum + assignment.quantity, 0);
    
    const otherAssignments = userBots.battalionAssignments
      .filter((assignment: any) => assignment.botType !== botType);
    
    const otherAssigned = otherAssignments
      .reduce((sum: number, assignment: any) => sum + assignment.quantity, 0);

    // Calculate available bots for this type
    const totalAvailable = userBots.bots[botType] || 0;
    const newAvailable = totalAvailable - currentAssigned;

    if (newAvailable < 0) {
      res.status(400).json({ error: 'Insufficient bots' });
      return;
    }

    await userBots.save();

    res.json({ 
      success: true, 
      availableBots: newAvailable,
      assignments: userBots.battalionAssignments
    });

  } catch (error) {
    console.error('Bot assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bot build state
router.get('/build', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const userBots = await Bot.findOne({ userId });
    
    if (!userBots) {
      res.json({
        isBuilding: false,
        buildQueue: null,
        remainingTime: 0
      });
      return;
    }

    res.json({
      isBuilding: !!userBots.buildQueue,
      buildQueue: userBots.buildQueue,
      remainingTime: userBots.buildQueue ? userBots.buildQueue.remainingTime : 0
    });

  } catch (error) {
    console.error('Get build state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
