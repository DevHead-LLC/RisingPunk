import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Please authenticate' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    req.user = { _id: (decoded as any).userId };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
    return;
  }
};

export default auth; 