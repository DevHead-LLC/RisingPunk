import { Request, Response, NextFunction } from 'express';
import { Battle } from '../models/Battle';
import { BattlePhase } from '../types/battle';

interface AuthenticatedRequest extends Request {
  user: { _id: string };
}

/**
 * Battle-specific authentication middleware
 * Verifies user owns the battle or is a participant
 * Checks battle is active for action submissions
 */
const battleAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // First, ensure user is authenticated
    if (!req.user?._id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = req.user._id;
    const battleId = req.params.id;

    // For routes that don't require battle-specific checks (like /start)
    if (!battleId) {
      next();
      return;
    }

    // Get battle from database
    const battle = await Battle.findOne({ battleId });
    
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    // Verify user is a participant (attacker or defender)
    if (battle.attackerId !== userId && battle.defenderId !== userId) {
      res.status(403).json({ error: 'User not authorized to access this battle' });
      return;
    }

    // For action submissions, check if battle is active
    if (req.method === 'POST' && req.path.includes('/action')) {
      if (battle.phase !== BattlePhase.ACTIVE) {
        res.status(400).json({ error: 'Battle is not active' });
        return;
      }
    }

    // Add battle info to request for controller use
    (req as any).battle = battle;
    next();
  } catch (error) {
    console.error('Battle auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export default battleAuth; 