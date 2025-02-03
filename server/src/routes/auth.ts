import express, { Request, Response, Router, NextFunction } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

interface RegisterRequest extends Request {
  body: {
    email: string;
    handle: string;
    accessKey: string;
  }
}

interface LoginRequest extends Request {
  body: {
    handle: string;
    accessKey: string;
  }
}

interface UserResponse {
  token: string;
  user: {
    handle: string;
    email: string;
    level: number;
    unlockedFeatures: {
      hackRig: boolean;
    };
  }
}

const router: Router = express.Router();

// Register new user
router.post<{}, UserResponse | { error: string }, RegisterRequest['body']>(
  '/register', 
  async (req, res): Promise<void> => {
    try {
      console.log('Registration attempt:', req.body);
      const { email, handle, accessKey } = req.body;
      
      // Check for existing user
      const existingUser = await User.findOne({ 
        $or: [{ email }, { handle }] 
      });
      
      if (existingUser) {
        console.log('User already exists:', existingUser.handle);
        res.status(400).json({ 
          error: existingUser.email === email ? 'Email already exists' : 'Handle already exists'
        });
        return;
      }

      // Create user
      const user = new User({
        email,
        handle,
        hashedAccessKey: accessKey
      });

      await user.save();
      console.log('New user created:', user.handle);

      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          handle: user.handle,
          email: user.email,
          level: user.level,
          unlockedFeatures: {
            hackRig: user.unlockedFeatures?.hackRig || false
          }
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Registration failed' });
      return;
    }
  });

// Login user
router.post<{}, UserResponse | { error: string }, LoginRequest['body']>(
  '/login',
  async (req, res): Promise<void> => {
    try {
      console.log('Login attempt in database:', mongoose.connection.name);
      const { handle, accessKey } = req.body;
      
      const user = await User.findOne({ handle });
      console.log('User search result:', user ? 'Found' : 'Not found');
      if (!user) {
        res.status(401).json({ error: 'Authentication failed' });
        return;
      }

      const isValid = await user.verifyAccessKey(accessKey);
      if (!isValid) {
        res.status(401).json({ error: 'Authentication failed' });
        return;
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          handle: user.handle,
          email: user.email,
          level: user.level,
          unlockedFeatures: {
            hackRig: user.unlockedFeatures?.hackRig || false
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

export default router; 