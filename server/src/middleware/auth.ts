import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Please authenticate' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    const userId = (decoded as any).userId;
    const sessionId = (decoded as any).sessionId;
    
    // Check if session is still valid (not invalidated by new login)
    const user = await User.findById(userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    // Only check sessionId if the token has one (new tokens)
    // Old tokens without sessionId are still valid
    if (sessionId && !user.isTokenValid(sessionId)) {
      res.status(401).json({ error: 'ACCOUNT_SWITCHED' });
      return;
    }
    
    req.user = { _id: userId };
    next();
  } catch (error) {
    // Handle specific error types
    // Check TokenExpiredError first since it extends JsonWebTokenError
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Check if it's an invalid signature (likely environment mismatch)
      if (error.message === 'invalid signature') {
        console.error('🔴 AUTH: Invalid token signature - likely environment mismatch (staging token used on dev server or vice versa)');
        console.error('🔴 AUTH: User needs to log out and log back in to get a new token for this environment');
        res.status(401).json({ 
          error: 'Invalid token signature. Please log out and log back in. This usually happens when switching between dev/staging/prod environments.' 
        });
      } else {
        console.error('🔴 AUTH: Authentication error:', error);
        res.status(401).json({ error: 'Invalid token' });
      }
    } else {
      // Database or other errors
      console.error('🔴 AUTH: Database or system error during authentication:', error);
      res.status(500).json({ error: 'Authentication service unavailable' });
    }
    return;
  }
};

export default auth; 