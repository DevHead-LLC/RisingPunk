import express, { Request, Response, Router, NextFunction } from 'express';
import { User } from '../models/User';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { GoogleAuthService } from '../services/GoogleAuthService';

// Helper function to safely escape regex special characters
function escapeRegexString(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface RegisterRequest extends Request {
  body: {
    email: string;
    accessKey: string;
  }
}

interface LoginRequest extends Request {
  body: {
    handle: string;
    accessKey: string;
  }
}

interface GoogleSignInRequest extends Request {
  body: {
    idToken: string;
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
    onboardingCompleted: boolean;
    needsHandleSelection: boolean;
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
      const { email, accessKey } = req.body;
      
      // Check for existing email using the static method
      const emailExists = await User.emailExists(email);
      
      if (emailExists) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }

      // Create user with temporary handle and needsHandleSelection flag
      console.log('🔵 SERVER: Creating user with needsHandleSelection: true');
      const user = new User({
        email,
        handle: `user_${Date.now()}`,
        hashedAccessKey: accessKey,
        needsHandleSelection: true
      });

      await user.save();
      console.log('🔵 SERVER: User saved, needsHandleSelection:', user.needsHandleSelection);

      // Create research data for new user
      await createUserResearchData(user._id as mongoose.Types.ObjectId);

      // Generate token
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '7d' }
      );

      console.log('🔵 SERVER: About to send response, user.needsHandleSelection:', user.needsHandleSelection);
      
      res.status(201).json({
        token,
        user: {
          handle: user.handle,
          email: user.getDecryptedEmail(),
          level: user.level,
          unlockedFeatures: {
            hackRig: user.unlockedFeatures?.hackRig || false
          },
          onboardingCompleted: user.onboardingCompleted || false,
          needsHandleSelection: user.needsHandleSelection || false
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
      
      const user = await User.findOne({ handle: { $regex: new RegExp(`^${escapeRegexString(handle)}$`, 'i') } });
      if (!user) {
        res.status(401).json({ error: 'Authentication failed' });
        return;
      }

      // Check if this is a Google Sign-In account (no password set)
      if (user.googleId && !user.hashedAccessKey) {
        res.status(400).json({ error: 'This account was created with Google Sign-In. Please use the "SIGN_IN_WITH_GOOGLE" option to sign in.' });
        return;
      }

      // Check if password is provided for verification
      if (!user.hashedAccessKey) {
        res.status(400).json({ error: 'No password set for this account. Please use the "SIGN_IN_WITH_GOOGLE" option to sign in.' });
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
          email: user.getDecryptedEmail(),
          level: user.level,
          unlockedFeatures: {
            hackRig: user.unlockedFeatures?.hackRig || false
          },
          onboardingCompleted: user.onboardingCompleted || false,
          needsHandleSelection: user.needsHandleSelection || false,
          debugFeatures: {
            enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
            enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

// Google Sign-In (Login only - no account creation)
router.post<{}, UserResponse | { error: string }, GoogleSignInRequest['body']>(
  '/google-signin',
  async (req, res): Promise<void> => {
    console.log('🔵 GSI Server Route: Google Sign-In request received');
    try {
      const { idToken } = req.body;
      console.log('🔵 GSI Server Route: ID Token received, length:', idToken?.length);
      
      if (!GoogleAuthService.isEnabled()) {
        console.log('🔴 GSI Server Route: Google Sign-In service not enabled');
        res.status(503).json({ error: 'Google Sign-In is not configured' });
        return;
      }

      console.log('🔵 GSI Server Route: Verifying Google token');
      // Verify Google token
      const googleUser = await GoogleAuthService.verifyToken(idToken);
      if (!googleUser) {
        console.log('🔴 GSI Server Route: Google token verification failed');
        res.status(401).json({ error: 'Invalid Google token' });
        return;
      }
      
      console.log('🔵 GSI Server Route: Google token verified successfully');
      console.log('🔵 GSI Server Route: Google user email:', googleUser.email);

      // Check if user exists with this Google ID
      console.log('🔵 GSI Server Route: Looking up user by Google ID:', googleUser.googleId);
      let user = await User.findByGoogleId(googleUser.googleId);
      
      if (user) {
        console.log('🔵 GSI Server Route: Existing user found with Google ID');
        // User exists, log them in
        const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET || 'defaultsecret',
          { expiresIn: '7d' }
        );

        console.log('🔵 GSI Server Route: JWT token created, sending response');
        res.json({
          token,
          user: {
            handle: user.handle,
            email: user.getDecryptedEmail(),
            level: user.level,
            unlockedFeatures: {
              hackRig: user.unlockedFeatures?.hackRig || false
            },
            onboardingCompleted: user.onboardingCompleted || false,
            needsHandleSelection: user.needsHandleSelection || false,
            debugFeatures: {
              enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
              enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
            }
          }
        });
        return;
      }

      // Check if user exists with this email but no Google ID
      const emailExists = await User.emailExists(googleUser.email);
      if (emailExists) {
        console.log('🔵 GSI Server Route: Email exists but no Google ID - linking accounts');
        // Email exists but no Google ID, link accounts
        user = await User.findOne({ emailHash: require('../services/EncryptionService').EncryptionService.hashEmail(googleUser.email) });
        if (user) {
          user.googleId = googleUser.googleId;
          await user.save();
          
          const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'defaultsecret',
            { expiresIn: '7d' }
          );

          res.json({
            token,
            user: {
              handle: user.handle,
              email: user.getDecryptedEmail(),
              level: user.level,
              unlockedFeatures: {
                hackRig: user.unlockedFeatures?.hackRig || false
              },
              onboardingCompleted: user.onboardingCompleted || false,
              needsHandleSelection: user.needsHandleSelection || false
            }
          });
          return;
        }
      }

      // No account found - return error for login attempt
      console.log('🔴 GSI Server Route: No account found for Google Sign-In');
      res.status(404).json({ 
        error: 'No account found with this Google account. Please use the "NEW_IDENTITY (SIGN_UP)" option to create an account.'
      });

    } catch (error) {
      console.error('Google Sign-In error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

// Google Sign-Up (Account creation)
router.post<{}, UserResponse | { error: string }, GoogleSignInRequest['body']>(
  '/google-signup',
  async (req, res): Promise<void> => {
    console.log('🔵 GSU Server Route: Google Sign-Up request received');
    try {
      const { idToken } = req.body;
      console.log('🔵 GSU Server Route: ID Token received, length:', idToken?.length);
      
      if (!GoogleAuthService.isEnabled()) {
        console.log('🔴 GSU Server Route: Google Sign-In service not enabled');
        res.status(503).json({ error: 'Google Sign-In is not configured' });
        return;
      }

      console.log('🔵 GSU Server Route: Verifying Google token');
      // Verify Google token
      const googleUser = await GoogleAuthService.verifyToken(idToken);
      if (!googleUser) {
        console.log('🔴 GSU Server Route: Google token verification failed');
        res.status(401).json({ error: 'Invalid Google token' });
        return;
      }
      
      console.log('🔵 GSU Server Route: Google token verified successfully');
      console.log('🔵 GSU Server Route: Google user email:', googleUser.email);

      // Check if user already exists with this Google ID
      console.log('🔵 GSU Server Route: Checking if user already exists with Google ID:', googleUser.googleId);
      let user = await User.findByGoogleId(googleUser.googleId);
      
      if (user) {
        console.log('🔴 GSU Server Route: User already exists with this Google ID');
        res.status(400).json({ 
          error: 'An account already exists with this Google account. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
        });
        return;
      }

      // Check if user exists with this email
      const emailExists = await User.emailExists(googleUser.email);
      if (emailExists) {
        console.log('🔴 GSU Server Route: Email already exists');
        res.status(400).json({ 
          error: 'An account already exists with this email address. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
        });
        return;
      }

      // Create new user with Google Sign-Up
      console.log('🔵 GSU Server Route: Creating new user account');
      const handle = `user_${Date.now()}`; // Generate unique handle
      user = new User({
        email: googleUser.email,
        handle,
        googleId: googleUser.googleId,
        needsHandleSelection: true
        // Note: hashedAccessKey is optional for Google Sign-In users
      });

      await user.save();
      console.log('🔵 GSU SERVER: User saved, needsHandleSelection:', user.needsHandleSelection);

      // Create research data for new user
      await createUserResearchData(user._id as mongoose.Types.ObjectId);

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '7d' }
      );

      console.log('🔵 GSU Server Route: New user created successfully');
      console.log('🔵 GSU SERVER: About to send response, user.needsHandleSelection:', user.needsHandleSelection);
      
      res.status(201).json({
        token,
        user: {
          handle: user.handle,
          email: user.getDecryptedEmail(),
          level: user.level,
          unlockedFeatures: {
            hackRig: user.unlockedFeatures?.hackRig || false
          },
          onboardingCompleted: user.onboardingCompleted || false,
          needsHandleSelection: user.needsHandleSelection || false
        }
      });

    } catch (error) {
      console.error('Google Sign-Up error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

// Mark onboarding as completed
router.post('/onboarding-complete', async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret') as { userId: string };
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.onboardingCompleted = true;
    await user.save();

    res.json({ success: true, message: 'Onboarding marked as completed' });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user handle
router.post('/update-handle', async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret') as { userId: string };
    
    const { handle } = req.body;
    
    if (!handle || typeof handle !== 'string') {
      res.status(400).json({ error: 'Handle is required' });
      return;
    }

    if (handle.length < 5 || handle.length > 15) {
      res.status(400).json({ error: 'Handle must be between 5 and 15 characters' });
      return;
    }

    if (!/^[a-zA-Z0-9!&%^*]+$/.test(handle)) {
      res.status(400).json({ error: 'Handle can only contain letters, numbers, and !&%^*' });
      return;
    }

    // Check for existing user with same handle (case-insensitive)
    const existingUser = await User.findOne({ 
      handle: { $regex: new RegExp(`^${escapeRegexString(handle)}$`, 'i') },
      _id: { $ne: decoded.userId } // Exclude current user
    });
    
    if (existingUser) {
      res.status(400).json({ error: 'Handle already exists' });
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.handle = handle;
    user.needsHandleSelection = false;
    await user.save();

    console.log('🔵 SERVER: Handle updated successfully:', {
      userId: user._id,
      oldHandle: user.handle,
      newHandle: handle,
      needsHandleSelection: user.needsHandleSelection
    });

    res.json({
      success: true,
      user: {
        handle: user.handle,
        email: user.getDecryptedEmail(),
        level: user.level,
        unlockedFeatures: {
          hackRig: user.unlockedFeatures?.hackRig || false
        },
        onboardingCompleted: user.onboardingCompleted || false,
        needsHandleSelection: user.needsHandleSelection || false
      }
    });
  } catch (error) {
    console.error('Handle update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check handle availability (no auth required for real-time checking)
router.post('/check-handle', async (req, res): Promise<void> => {
  try {
    const { handle } = req.body;
    
    if (!handle || typeof handle !== 'string') {
      res.status(400).json({ error: 'Handle is required' });
      return;
    }

    // Check for existing user with same handle (case-insensitive)
    const existingUser = await User.findOne({ 
      handle: { $regex: new RegExp(`^${escapeRegexString(handle)}$`, 'i') }
    });
    
    const available = !existingUser;
    
    res.json({ 
      available,
      message: available ? 'Handle is available' : 'Handle is already taken'
    });
  } catch (error) {
    console.error('Handle availability check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token and get current user data
router.get('/verify-token', async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret') as { userId: string };
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('🔵 SERVER: Token verified, returning current user data:', {
      userId: user._id,
      handle: user.handle,
      onboardingCompleted: user.onboardingCompleted,
      needsHandleSelection: user.needsHandleSelection
    });

    res.json({
      success: true,
      user: {
        _id: user._id,
        handle: user.handle,
        email: user.getDecryptedEmail(),
        level: user.level,
        unlockedFeatures: {
          hackRig: user.unlockedFeatures?.hackRig || false
        },
        profileGender: user.profileGender || 'male',
        onboardingCompleted: user.onboardingCompleted || false,
        needsHandleSelection: user.needsHandleSelection || false,
        debugFeatures: {
          enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
          enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
        }
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router; 