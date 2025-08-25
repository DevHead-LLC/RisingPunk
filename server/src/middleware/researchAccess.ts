import { Request, Response, NextFunction } from 'express';
import { ResearchUnlockService } from '../services/ResearchUnlockService';

export const researchAccessControl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;
    const categoryId = req.params.categoryId || req.body.categoryId;
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Research category ID is required'
      });
    }

    const validation = await ResearchUnlockService.validateUnlockRequirements(userId, categoryId);
    
    if (!validation.canUnlock) {
      return res.status(403).json({
        success: false,
        message: 'Research category is locked',
        data: {
          canUnlock: false,
          reasons: validation.reasons,
          missingRequirements: validation.missingRequirements
        }
      });
    }

    next();
  } catch (error) {
    console.error('Research access control error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking research access'
    });
  }
};
