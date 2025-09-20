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
    if (user) {
      console.log('🔍 AUTH: Checking session validity:', {
        userId: userId,
        currentSessionId: user.currentTokenId,
        requestSessionId: sessionId,
        hasSessionId: !!sessionId,
        isValid: sessionId ? user.isTokenValid(sessionId) : true
      });
      
      // Only check sessionId if the token has one (new tokens)
      // Old tokens without sessionId are still valid
      if (sessionId && !user.isTokenValid(sessionId)) {
        console.log('🔍 AUTH: Session invalidated by new login, sending ACCOUNT_SWITCHED');
        res.status(401).json({ error: 'ACCOUNT_SWITCHED' });
        return;
      }
    }
    
    req.user = { _id: userId };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
    return;
  }
};

export default auth; 