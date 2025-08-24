import express, { Request, Response, Router, NextFunction } from 'express';
import { User } from '../models/User';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
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

if (process.env.NODE_ENV !== 'production') {
  router.post('/create-test-user', async (req, res): Promise<void> => {
    try {
      const existingUser = await User.findOne({ handle: 'testuser' });
      
      if (existingUser) {
        res.json({
          message: 'Test user already exists',
          credentials: {
            handle: 'testuser',
            accessKey: 'testpass123'
          }
        });
        return;
      }

      const user = new User({
        email: 'test@example.com',
        handle: 'testuser',
        hashedAccessKey: 'testpass123'
      });

      await user.save();

      res.json({
        message: 'Test user created successfully',
        credentials: {
          handle: 'testuser',
          accessKey: 'testpass123'
        }
      });

    } catch (error) {
      console.error('Test user creation error:', error);
      res.status(500).json({ error: 'Failed to create test user' });
    }
  });
}

// Helper function to create research data for new users
async function createUserResearchData(userId: mongoose.Types.ObjectId): Promise<void> {
  try {
    const researchCategories = await Research.find().select('_id');
    
    const researchUserEntries = researchCategories.map(research => ({
      userId,
      researchId: research._id,
      isUnlocked: false,
      unlockedAt: null,
      unlockCost: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    await ResearchUser.insertMany(researchUserEntries);
    console.log(`Created research data for new user ${userId}`);
  } catch (error) {
    console.error('Error creating research data for new user:', error);
    throw error;
  }
}

// Register new user
router.post<{}, UserResponse | { error: string }, RegisterRequest['body']>(
  '/register', 
  async (req, res): Promise<void> => {
    try {
      const { email, handle, accessKey } = req.body;
      
      // Check for existing user
      const existingUser = await User.findOne({ 
        $or: [{ email }, { handle }] 
      });
      
      if (existingUser) {
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

      // Create research data for new user
      await createUserResearchData(user._id as mongoose.Types.ObjectId);

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
      const { handle, accessKey } = req.body;
      
      const user = await User.findOne({ handle });
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