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
      console.log('🔍 AUTH: User not found in database, token may be for deleted user');
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Only log session validation for debugging (reduce log spam)
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) { // Log 1% of requests
      console.log('🔍 AUTH: Checking session validity:', {
        userId: userId,
        currentSessionId: user.currentTokenId,
        requestSessionId: sessionId,
        hasSessionId: !!sessionId,
        isValid: sessionId ? user.isTokenValid(sessionId) : true
      });
    }
    
    // Only check sessionId if the token has one (new tokens)
    // Old tokens without sessionId are still valid
    if (sessionId && !user.isTokenValid(sessionId)) {
      console.log('🔍 AUTH: Session invalidated by new login, sending ACCOUNT_SWITCHED');
      res.status(401).json({ error: 'ACCOUNT_SWITCHED' });
      return;
    }
    
    req.user = { _id: userId };
    next();
  } catch (error) {
    console.error('🔴 AUTH: Authentication error:', error);
    
    // Handle specific error types
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      // Database or other errors
      console.error('🔴 AUTH: Database or system error during authentication:', error);
      res.status(500).json({ error: 'Authentication service unavailable' });
    }
    return;
  }
};

export default auth; 