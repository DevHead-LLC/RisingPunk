import express, { Request, Response, Router, NextFunction } from 'express';
import { User } from '../models/User';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import auth from '../middleware/auth';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { AppleAuthService } from '../services/AppleAuthService';
import { EmailService } from '../services/EmailService';
import { EncryptionService } from '../services/EncryptionService';
import { MapService } from '../services/MapService';
import { filterBadWords, containsBadWords, containsBadWordsForHandle } from '../utils/contentModeration';

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

interface AppleSignInRequest extends Request {
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
    experience?: {
      current: number;
      nextLevel: number;
      total: number;
    };
    armyBonus?: {
      strength: number;
      defense: number;
      speed: number;
      health: number;
    };
    balance?: {
      total: number;
      ratePerSecond: number;
      lastUpdated: Date;
      fractionalRemainder: number;
      rentalHousingIncomeLastSynced?: Date | null;
    };
    unlockedFeatures: {
      hackRig: boolean;
      researchCenter?: boolean;
      rentalHousing1?: boolean;
      rentalHousing2?: boolean;
      rentalHousing3?: boolean;
      rentalHousing4?: boolean;
    };
    profileGender?: 'male' | 'female';
    onboardingCompleted: boolean;
    needsHandleSelection: boolean;
    emailVerified: boolean;
    emailVerificationToken?: string | null;
    emailVerificationPrompted?: boolean;
    debugFeatures?: {
      enableDataRefresh: boolean;
      enableDebugLogs: boolean;
    };
    isGuest?: boolean;
    hasPassword?: boolean;
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
    if (researchCategories.length === 0) {
      return;
    }
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
      
      if (!email || !accessKey) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailHash = EncryptionService.hashEmail(normalizedEmail);
      
      const directCheck = await User.findOne({ emailHash });
      
      const emailExists = await User.emailExists(normalizedEmail);
      
      if (emailExists || directCheck) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }
      
      const finalCheck = await User.findOne({ emailHash });
      if (finalCheck) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }

      const user = new User({
        email: normalizedEmail,
        handle: `user_${Date.now()}`,
        hashedAccessKey: accessKey,
        needsHandleSelection: true
      });
      
      try {
        await user.save();
      } catch (saveError: any) {
        if (saveError.code === 11000) {
          if (saveError.keyValue && saveError.keyValue.emailHash) {
            const existingUser = await User.findOne({ emailHash: saveError.keyValue.emailHash });
            if (existingUser) {
              res.status(400).json({ error: 'Email already exists' });
              return;
            }
          }
          if (saveError.keyValue && saveError.keyValue.email) {
            res.status(400).json({ error: 'Email already exists' });
            return;
          }
          if (saveError.keyValue && saveError.keyValue.handle) {
            res.status(400).json({ error: 'Username already exists. Please try again.' });
            return;
          }
        }
        
        throw saveError;
      }

      // Create research data for new user
      await createUserResearchData(user._id as mongoose.Types.ObjectId);

      // Generate session ID and token
      const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      user.setCurrentToken(sessionId);
      await user.save();
      
      const token = jwt.sign(
        { userId: user._id, sessionId },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '7d' }
      );

      
      res.status(201).json({
        token,
        user: {
          handle: user.handle,
          email: user.getDecryptedEmail(),
          level: user.level,
          experience: user.experience,
          armyBonus: user.armyBonus,
          balance: user.balance,
          unlockedFeatures: user.unlockedFeatures,
          profileGender: user.profileGender,
          onboardingCompleted: user.onboardingCompleted || false,
          needsHandleSelection: user.needsHandleSelection || false,
          emailVerified: user.emailVerified || false,
          emailVerificationToken: user.emailVerificationToken || null,
          emailVerificationPrompted: user.emailVerificationPrompted || false,
          debugFeatures: {
            enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
            enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
          },
          isGuest: false,
          hasPassword: true
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle duplicate key errors specifically
      if (error instanceof Error && error.message.includes('E11000')) {
        if (error.message.includes('emailHash')) {
          res.status(400).json({ error: 'Email already exists' });
          return;
        }
        if (error.message.includes('email')) {
          res.status(400).json({ error: 'Email already exists' });
          return;
        }
        if (error.message.includes('handle')) {
          res.status(400).json({ error: 'Username already exists. Please try again.' });
          return;
        }
      }
      
      res.status(500).json({ error: error instanceof Error ? error.message : 'Registration failed' });
      return;
    }
  });

// Helper to send guest/get-or-create response (same shape for create and device-linked resume)
// Used when creating a new guest or when returning the device-linked account (guest or formerly-guest-now-linked).
function sendGuestUserResponse(res: Response, user: any, token: string, statusCode: number): void {
  res.status(statusCode).json({
    token,
    user: {
      handle: user.handle,
      email: user.getDecryptedEmail(),
      level: user.level,
      experience: user.experience,
      armyBonus: user.armyBonus,
      balance: user.balance,
      unlockedFeatures: user.unlockedFeatures,
      profileGender: user.profileGender,
      onboardingCompleted: user.onboardingCompleted || false,
      needsHandleSelection: user.needsHandleSelection || false,
      emailVerified: user.emailVerified || false,
      emailVerificationToken: user.emailVerificationToken || null,
      emailVerificationPrompted: user.emailVerificationPrompted || false,
      debugFeatures: {
        enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
        enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
      },
      isGuest: !!user.isGuest,
      hasPassword: !!user.hashedAccessKey
    }
  });
}

// Play as guest — one guest per device: get existing guest by deviceId or create new (no email/password)
// Optional body.forceNew: if true, unlink this device from any existing user and create a new guest (no manual DB cleanup needed).
router.post('/guest', async (req, res): Promise<void> => {
  try {
    const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.trim() : undefined;
    const forceNew = req.body?.forceNew === true;

    if (deviceId && forceNew) {
      const existing = await User.findOne({ guestDeviceId: deviceId });
      if (existing) {
        existing.guestDeviceId = undefined;
        await existing.save();
      }
    }

    if (deviceId && !forceNew) {
      // Find device-linked account by guestDeviceId only (guest or formerly-guest-now-linked).
      const existing = await User.findOne({ guestDeviceId: deviceId });
      if (existing) {
        // Try to return existing user (with one retry for transient errors). Never clear guestDeviceId
        // on failure — that would orphan the account and lose progress on transient DB/network errors.
        let lastReturnError: unknown;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            existing.setCurrentToken(sessionId);
            await existing.save();

            const token = jwt.sign(
              { userId: existing._id, sessionId },
              process.env.JWT_SECRET || 'defaultsecret',
              { expiresIn: '7d' }
            );
            sendGuestUserResponse(res, existing, token, 200);
            return;
          } catch (returnError) {
            lastReturnError = returnError;
            if (attempt === 0) {
              console.warn('Guest return-existing failed, will retry once:', returnError);
              continue;
            }
          }
        }
        console.error('Guest return-existing failed after retry:', lastReturnError);
        res.status(503).json({
          error: 'Could not restore your session. Please try again in a moment. If this persists, contact support@risingpunk.com.'
        });
        return;
      }
    }

    const guestHandle = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const user = new User({
      handle: guestHandle,
      needsHandleSelection: true,
      isGuest: true,
      emailVerificationPrompted: true,
      ...(deviceId && { guestDeviceId: deviceId })
    });

    try {
      await user.save();
    } catch (saveError: any) {
      if (saveError.code === 11000 && saveError.keyValue?.guestDeviceId && deviceId) {
        // Race: another request created the guest for this deviceId; return that user with new session.
        const existing = await User.findOne({ guestDeviceId: deviceId });
        if (existing) {
          let lastReturnError: unknown;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
              existing.setCurrentToken(sessionId);
              await existing.save();
              const token = jwt.sign(
                { userId: existing._id, sessionId },
                process.env.JWT_SECRET || 'defaultsecret',
                { expiresIn: '7d' }
              );
              sendGuestUserResponse(res, existing, token, 200);
              return;
            } catch (returnError) {
              lastReturnError = returnError;
              if (attempt === 0) {
                console.warn('Guest race return-existing failed, will retry once:', returnError);
                continue;
              }
            }
          }
          console.error('Guest race return-existing failed after retry:', lastReturnError);
          res.status(503).json({
            error: 'Could not restore your session. Please try again in a moment. If this persists, contact support@risingpunk.com.'
          });
          return;
        }
        throw saveError;
      } else
      if (saveError.code === 11000 && saveError.keyValue?.handle) {
        const retryHandle = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        user.handle = retryHandle;
        await user.save();
      } else {
        throw saveError;
      }
    }

    try {
      await createUserResearchData(user._id as mongoose.Types.ObjectId);
    } catch (researchError) {
      // Research data creation failed; user is already in DB with guestDeviceId. Remove the user
      // so retry creates a fresh guest (and research data) instead of returning a broken user.
      // Per taskItems/ios/appWide/guest-login-play-as-guest.md and android/appWide/guest-login-play-as-guest.md
      console.error('Guest creation: createUserResearchData failed, removing user to allow retry:', researchError);
      await User.findByIdAndDelete(user._id).catch((e) => console.error('Failed to delete guest user after research data failure:', e));
      throw researchError;
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    user.setCurrentToken(sessionId);
    await user.save();

    const token = jwt.sign(
      { userId: user._id, sessionId },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '7d' }
    );

    sendGuestUserResponse(res, user, token, 201);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Guest creation error:', err.message, err.stack);
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Guest creation error code/keyValue:', (error as { code?: number; keyValue?: Record<string, unknown> }).code, (error as { keyValue?: Record<string, unknown> }).keyValue);
    }
    res.status(500).json({ error: 'Failed to create guest account' });
  }
});

// Login user — accepts handle OR email (same password). If identifier contains @, lookup by email; otherwise by handle.
router.post<{}, UserResponse | { error: string }, LoginRequest['body']>(
  '/login',
  async (req, res): Promise<void> => {
    try {
      const { handle: identifier, accessKey } = req.body;

      if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
        res.status(400).json({ error: 'Username or email is required' });
        return;
      }

      const trimmed = identifier.trim();
      let user = null;
      if (trimmed.includes('@')) {
        user = await User.findByEmail(trimmed.toLowerCase());
      } else {
        user = await User.findOne({ handle: { $regex: new RegExp(`^${escapeRegexString(trimmed)}$`, 'i') } });
      }

      if (!user) {
        res.status(401).json({ error: 'Authentication failed' });
        return;
      }

      // Check if this is a Google Sign-In account (no password set)
      if (user.googleId && !user.hashedAccessKey) {
        res.status(400).json({ error: 'This account was created with Google Sign-In. Please use the "SIGN_IN_WITH_GOOGLE" option to sign in.' });
        return;
      }

      // Guest accounts have no password; they must link email/password in Profile first
      if (user.isGuest) {
        res.status(400).json({ error: 'This is a guest account. Link email and password in Profile to sign in from other devices.' });
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

      // Generate a unique session ID for this login
      const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      const token = jwt.sign(
        { userId: user._id, sessionId: sessionId },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '7d' }
      );
      
      // Set current session ID (invalidates all previous sessions)
      user.setCurrentToken(sessionId);
      await user.save();

        res.json({
        token,
        user: {
          handle: user.handle,
          email: user.getDecryptedEmail(),
          level: user.level,
          experience: user.experience,
          armyBonus: user.armyBonus,
          balance: user.balance,
          unlockedFeatures: user.unlockedFeatures,
          profileGender: user.profileGender,
          onboardingCompleted: user.onboardingCompleted || false,
          needsHandleSelection: user.needsHandleSelection || false,
          emailVerified: user.emailVerified || false,
          emailVerificationToken: user.emailVerificationToken || null,
          emailVerificationPrompted: user.emailVerificationPrompted || false,
          debugFeatures: {
            enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
            enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
          },
          isGuest: user.isGuest || false,
          hasPassword: !!(user as any).hashedAccessKey
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
    try {
      const { idToken } = req.body;
      
      if (!GoogleAuthService.isEnabled()) {
        res.status(503).json({ error: 'Google Sign-In is not configured' });
        return;
      }

      // Verify Google token
      const googleUser = await GoogleAuthService.verifyToken(idToken);
      if (!googleUser) {
        res.status(401).json({ error: 'Invalid Google token' });
        return;
      }
      

      // Check if user exists with this Google ID
      let user = await User.findByGoogleId(googleUser.googleId);
      
      if (user) {
        
        // No device session check needed - simple token invalidation handles this
        
        // User exists, log them in
        // Generate a unique session ID for this login
        const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        
        const token = jwt.sign(
          { userId: user._id, sessionId: sessionId },
          process.env.JWT_SECRET || 'defaultsecret',
          { expiresIn: '7d' }
        );

        // Set current session ID (invalidates all previous sessions)
        user.setCurrentToken(sessionId);
        await user.save();

        res.json({
          token,
          user: {
            handle: user.handle,
            email: user.getDecryptedEmail(),
            level: user.level,
            experience: user.experience,
            armyBonus: user.armyBonus,
            balance: user.balance,
            unlockedFeatures: user.unlockedFeatures,
            profileGender: user.profileGender,
            onboardingCompleted: user.onboardingCompleted || false,
            needsHandleSelection: user.needsHandleSelection || false,
            emailVerified: user.emailVerified || false,
            emailVerificationToken: user.emailVerificationToken || null,
            emailVerificationPrompted: user.emailVerificationPrompted || false,
            debugFeatures: {
              enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
              enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
            },
            isGuest: user.isGuest || false,
            hasPassword: !!(user as any).hashedAccessKey
          }
        });
        return;
      }

      // Check if user exists with this email but no Google ID
      const emailExists = await User.emailExists(googleUser.email);
      if (emailExists) {
        // Email exists but no Google ID, link accounts
        user = await User.findOne({ emailHash: require('../services/EncryptionService').EncryptionService.hashEmail(googleUser.email) });
        if (user) {
          // No device session check needed - simple token invalidation handles this
          
          user.googleId = googleUser.googleId;
          await user.save();
          
          // Generate a unique session ID for this login
          const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          
          const token = jwt.sign(
            { userId: user._id, sessionId: sessionId },
            process.env.JWT_SECRET || 'defaultsecret',
            { expiresIn: '7d' }
          );

          // Set current session ID (invalidates all previous sessions)
          user.setCurrentToken(sessionId);
          await user.save();

          res.json({
            token,
            user: {
              handle: user.handle,
              email: user.getDecryptedEmail(),
              level: user.level,
              experience: user.experience,
              armyBonus: user.armyBonus,
              balance: user.balance,
              unlockedFeatures: user.unlockedFeatures,
              profileGender: user.profileGender,
              onboardingCompleted: user.onboardingCompleted || false,
              needsHandleSelection: user.needsHandleSelection || false,
              emailVerified: user.emailVerified || false,
              emailVerificationToken: user.emailVerificationToken || null,
              emailVerificationPrompted: user.emailVerificationPrompted || false,
              debugFeatures: {
                enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
                enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
              },
              isGuest: user.isGuest || false,
              hasPassword: !!(user as any).hashedAccessKey
            }
          });
          return;
        }
      }

      // No account found - return error for login attempt
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
    try {
      const { idToken } = req.body;
      
      if (!GoogleAuthService.isEnabled()) {
        res.status(503).json({ error: 'Google Sign-In is not configured' });
        return;
      }

      // Verify Google token
      const googleUser = await GoogleAuthService.verifyToken(idToken);
      if (!googleUser) {
        res.status(401).json({ error: 'Invalid Google token' });
        return;
      }
      

      // Check if user already exists with this Google ID
      let user = await User.findByGoogleId(googleUser.googleId);
      
      if (user) {
        res.status(400).json({ 
          error: 'An account already exists with this Google account. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
        });
        return;
      }

      // Check if user exists with this email
      const emailExists = await User.emailExists(googleUser.email);
      if (emailExists) {
        res.status(400).json({ 
          error: 'An account already exists with this email address. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
        });
        return;
      }

      // Create new user with Google Sign-Up
      const handle = `user_${Date.now()}`; // Generate unique handle
      user = new User({
        email: googleUser.email,
        handle,
        googleId: googleUser.googleId,
        needsHandleSelection: true,
        emailVerified: true // Google Sign-In users have verified emails
        // Note: hashedAccessKey is optional for Google Sign-In users
      });

      await user.save();

      // Create research data for new user
      await createUserResearchData(user._id as mongoose.Types.ObjectId);

      // Generate session ID and token
      const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      user.setCurrentToken(sessionId);
      await user.save();
      
      const token = jwt.sign(
        { userId: user._id, sessionId },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '7d' }
      );

      
      res.status(201).json({
        token,
        user: {
          handle: user.handle,
          email: user.getDecryptedEmail(),
          level: user.level,
          experience: user.experience,
          armyBonus: user.armyBonus,
          balance: user.balance,
          unlockedFeatures: user.unlockedFeatures,
          profileGender: user.profileGender,
          onboardingCompleted: user.onboardingCompleted || false,
          needsHandleSelection: user.needsHandleSelection || false,
          emailVerified: user.emailVerified || false,
          emailVerificationToken: user.emailVerificationToken || null,
          emailVerificationPrompted: user.emailVerificationPrompted || false,
          debugFeatures: {
            enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
            enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
          },
          isGuest: false,
          hasPassword: false
        }
      });

    } catch (error) {
      console.error('Google Sign-Up error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

// Apple Sign-In (Login only - no account creation)
router.post<{}, UserResponse | { error: string }, AppleSignInRequest['body']>(
  '/apple-signin',
  async (req, res): Promise<void> => {
    try {
      const { idToken } = req.body;
      
      if (!AppleAuthService.isEnabled()) {
        res.status(503).json({ error: 'Apple Sign-In is not configured' });
        return;
      }

      // Verify Apple token
      const appleUser = await AppleAuthService.verifyToken(idToken);
      if (!appleUser) {
        res.status(401).json({ error: 'Invalid Apple token' });
        return;
      }
      

      // Check if user exists with this Apple ID
      let user = await User.findByAppleId(appleUser.appleId);
      
      if (user) {
        
        // Generate a unique session ID for this login
        const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        
        const token = jwt.sign(
          { userId: user._id, sessionId: sessionId },
          process.env.JWT_SECRET || 'defaultsecret',
          { expiresIn: '7d' }
        );
        
        // Set current session ID (invalidates all previous sessions)
        user.setCurrentToken(sessionId);
        await user.save();
        
        res.json({
          token,
          user: {
            handle: user.handle,
            email: user.getDecryptedEmail(),
            level: user.level,
            experience: user.experience,
            armyBonus: user.armyBonus,
            balance: user.balance,
            unlockedFeatures: user.unlockedFeatures,
            profileGender: user.profileGender,
            onboardingCompleted: user.onboardingCompleted || false,
            needsHandleSelection: user.needsHandleSelection || false,
            emailVerified: user.emailVerified || false,
            emailVerificationToken: user.emailVerificationToken || null,
            emailVerificationPrompted: user.emailVerificationPrompted || false,
            debugFeatures: {
              enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
              enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
            },
            isGuest: user.isGuest || false,
            hasPassword: !!(user as any).hashedAccessKey
          }
        });
        return;
      }

      // User not found with Apple ID - check if email exists for account linking
      
      // If Apple provided an email, check if there's an existing account with that email
      if (appleUser.email) {
        const existingUser = await User.findOne({ emailHash: EncryptionService.hashEmail(appleUser.email) });
        
        if (existingUser) {
          // Check if this account can be linked with Apple ID
          if (!existingUser.appleId) {
            existingUser.appleId = appleUser.appleId;
            await existingUser.save();
            
            // Generate session and return user data
            const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            const token = jwt.sign(
              { userId: existingUser._id, sessionId: sessionId },
              process.env.JWT_SECRET || 'defaultsecret',
              { expiresIn: '7d' }
            );
            
            existingUser.setCurrentToken(sessionId);
            await existingUser.save();
            
            res.json({
              token,
              user: {
                handle: existingUser.handle,
                email: existingUser.getDecryptedEmail(),
                level: existingUser.level,
                experience: existingUser.experience,
                armyBonus: existingUser.armyBonus,
                balance: existingUser.balance,
                unlockedFeatures: existingUser.unlockedFeatures,
                profileGender: existingUser.profileGender,
                onboardingCompleted: existingUser.onboardingCompleted || false,
                needsHandleSelection: existingUser.needsHandleSelection || false,
                emailVerified: existingUser.emailVerified || false,
                emailVerificationToken: existingUser.emailVerificationToken || null,
                emailVerificationPrompted: existingUser.emailVerificationPrompted || false,
                debugFeatures: {
                  enableDataRefresh: existingUser.debugFeatures?.enableDataRefresh || false,
                  enableDebugLogs: existingUser.debugFeatures?.enableDebugLogs || false
                },
                isGuest: existingUser.isGuest || false,
                hasPassword: !!(existingUser as any).hashedAccessKey
              }
            });
            return;
          } else {
            res.status(400).json({ 
              error: 'This email is already associated with an Apple account. Please use the correct Apple ID.'
            });
            return;
          }
        }
      }
      
      res.status(404).json({ 
        error: 'No account found with this Apple ID. Please use the "NEW_IDENTITY (SIGN_UP)" option to create an account.'
      });

    } catch (error) {
      console.error('Apple Sign-In error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Apple Sign-Up (Account creation)
router.post<{}, UserResponse | { error: string }, AppleSignInRequest['body']>(
  '/apple-signup',
  async (req, res): Promise<void> => {
    try {
      const { idToken } = req.body;
      
      if (!AppleAuthService.isEnabled()) {
        res.status(503).json({ error: 'Apple Sign-In is not configured' });
        return;
      }

      // Verify Apple token
      const appleUser = await AppleAuthService.verifyToken(idToken);
      if (!appleUser) {
        res.status(401).json({ error: 'Invalid Apple token' });
        return;
      }
      

      // Check if user already exists with this Apple ID
      let user = await User.findByAppleId(appleUser.appleId);
      
      if (user) {
        res.status(400).json({ 
          error: 'An account already exists with this Apple ID. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
        });
        return;
      }

      // Check if user exists with this email (if provided) - handle account linking
      if (appleUser.email) {
        const emailExists = await User.emailExists(appleUser.email);
        if (emailExists) {
          
          // Find the existing user with this email
          const existingUser = await User.findOne({ emailHash: EncryptionService.hashEmail(appleUser.email) });
          if (existingUser) {
            // Check if this is a Google account that can be linked
            if (existingUser.googleId && !existingUser.appleId) {
              existingUser.appleId = appleUser.appleId;
              await existingUser.save();
              
              // Generate session and return user data
              const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
              const token = jwt.sign(
                { userId: existingUser._id, sessionId: sessionId },
                process.env.JWT_SECRET || 'defaultsecret',
                { expiresIn: '7d' }
              );
              
              existingUser.setCurrentToken(sessionId);
              await existingUser.save();
              
              res.json({
                token,
                user: {
                  handle: existingUser.handle,
                  email: existingUser.getDecryptedEmail(),
                  level: existingUser.level,
                  experience: existingUser.experience,
                  armyBonus: existingUser.armyBonus,
                  balance: existingUser.balance,
                  unlockedFeatures: existingUser.unlockedFeatures,
                  profileGender: existingUser.profileGender,
                  onboardingCompleted: existingUser.onboardingCompleted || false,
                  needsHandleSelection: existingUser.needsHandleSelection || false,
                  emailVerified: existingUser.emailVerified || false,
                  emailVerificationToken: existingUser.emailVerificationToken || null,
                  emailVerificationPrompted: existingUser.emailVerificationPrompted || false,
                  debugFeatures: {
                    enableDataRefresh: existingUser.debugFeatures?.enableDataRefresh || false,
                    enableDebugLogs: existingUser.debugFeatures?.enableDebugLogs || false
                  },
                  isGuest: existingUser.isGuest || false,
                  hasPassword: !!(existingUser as any).hashedAccessKey
                }
              });
              return;
            }
            // Check if this is a basic email/password account that can be linked
            else if (existingUser.hashedAccessKey && !existingUser.appleId) {
              existingUser.appleId = appleUser.appleId;
              await existingUser.save();
              
              // Generate session and return user data
              const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
              const token = jwt.sign(
                { userId: existingUser._id, sessionId: sessionId },
                process.env.JWT_SECRET || 'defaultsecret',
                { expiresIn: '7d' }
              );
              
              existingUser.setCurrentToken(sessionId);
              await existingUser.save();
              
              res.json({
                token,
                user: {
                  handle: existingUser.handle,
                  email: existingUser.getDecryptedEmail(),
                  level: existingUser.level,
                  experience: existingUser.experience,
                  armyBonus: existingUser.armyBonus,
                  balance: existingUser.balance,
                  unlockedFeatures: existingUser.unlockedFeatures,
                  profileGender: existingUser.profileGender,
                  onboardingCompleted: existingUser.onboardingCompleted || false,
                  needsHandleSelection: existingUser.needsHandleSelection || false,
                  emailVerified: existingUser.emailVerified || false,
                  emailVerificationToken: existingUser.emailVerificationToken || null,
                  emailVerificationPrompted: existingUser.emailVerificationPrompted || false,
                  debugFeatures: {
                    enableDataRefresh: existingUser.debugFeatures?.enableDataRefresh || false,
                    enableDebugLogs: existingUser.debugFeatures?.enableDebugLogs || false
                  },
                  isGuest: existingUser.isGuest || false,
                  hasPassword: !!(existingUser as any).hashedAccessKey
                }
              });
              return;
            }
            // Account already has Apple ID or other conflicts
            else {
              res.status(400).json({ 
                error: 'An account already exists with this email address. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
              });
              return;
            }
          }
        }
      }

      // Create new user
      const isRealEmail = appleUser.email && !appleUser.email.includes('@privaterelay.appleid.com');
      const isApplePrivateRelay = appleUser.email && appleUser.email.includes('@privaterelay.appleid.com');
      const userEmail = appleUser.email || `apple_${appleUser.appleId}@system.appleid.com`; // Use system domain, not privaterelay
      
      const newUser = new User({
        email: userEmail,
        // Don't set emailHash here - let pre-save middleware handle it to avoid double hashing
        handle: `AppleUser${Date.now()}`,
        hashedAccessKey: '', // No password for Apple Sign-In accounts
        appleId: appleUser.appleId,
        needsHandleSelection: true,
        emailVerified: isRealEmail, // Only auto-verify if it's a real email
        emailVerificationPrompted: !isRealEmail && !isApplePrivateRelay, // Only prompt if no email provided (not private relay)
        // Note: Let schema defaults handle balance, experience, armyBonus, unlockedFeatures, etc.
      });

      await newUser.save();

      // Create research data for new user
      await createUserResearchData(newUser._id as mongoose.Types.ObjectId);

      // Generate a unique session ID for this login
      const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      const token = jwt.sign(
        { userId: newUser._id, sessionId: sessionId },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: '7d' }
      );
      
      // Set current session ID (invalidates all previous sessions)
      newUser.setCurrentToken(sessionId);
      await newUser.save();
      
      res.json({
        token,
        user: {
          handle: newUser.handle,
          email: newUser.getDecryptedEmail(),
          level: newUser.level,
          experience: newUser.experience,
          armyBonus: newUser.armyBonus,
          balance: newUser.balance,
          unlockedFeatures: newUser.unlockedFeatures,
          profileGender: newUser.profileGender,
          onboardingCompleted: newUser.onboardingCompleted || false,
          needsHandleSelection: newUser.needsHandleSelection || false,
          emailVerified: newUser.emailVerified || false,
          emailVerificationToken: newUser.emailVerificationToken || null,
          emailVerificationPrompted: newUser.emailVerificationPrompted || false,
          debugFeatures: {
            enableDataRefresh: newUser.debugFeatures?.enableDataRefresh || false,
            enableDebugLogs: newUser.debugFeatures?.enableDebugLogs || false
          },
          isGuest: false,
          hasPassword: false
        }
      });

    } catch (error) {
      console.error('Apple Sign-Up error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

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

    if (handle.includes('@')) {
      res.status(400).json({ error: 'Handle cannot contain the @ symbol.' });
      return;
    }

    if (handle.length < 5 || handle.length > 15) {
      res.status(400).json({ error: 'Handle must be between 5 and 15 characters' });
      return;
    }

    if (!/^[a-zA-Z0-9!&%^*_]+$/.test(handle)) {
      res.status(400).json({ error: 'Handle can only contain letters, numbers, and !&%^*_' });
      return;
    }

    // Check for bad words (treating underscores as word separators to prevent bypasses)
    if (containsBadWordsForHandle(handle)) {
      res.status(400).json({ error: 'Handle contains inappropriate language' });
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

    // Atomic update: user handle + map cells in one transaction so we never leave DB inconsistent on partial failure
    const session = await mongoose.startSession();
    let userForResponse: typeof User.prototype;
    try {
      userForResponse = await session.withTransaction(async () => {
        const user = await User.findById(decoded.userId).session(session);
        if (!user) {
          throw new Error('User not found');
        }
        // Note: Bad words check already done above, so we can save the handle as-is
        user.handle = handle;
        user.needsHandleSelection = false;
        await user.save({ session });
        // Keep map cells in sync: update displayed handle in all cells occupied by this user
        const mapService = new MapService();
        await mapService.updatePlayerHandleInMapCells(
          user._id as mongoose.Types.ObjectId,
          user.handle,
          session
        );
        return user;
      });
    } finally {
      await session.endSession();
    }

    const user = userForResponse;
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
        needsHandleSelection: user.needsHandleSelection || false,
        emailVerified: user.emailVerified || false,
        debugFeatures: {
          enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
          enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
        },
        isGuest: user.isGuest || false,
        hasPassword: !!(user as any).hashedAccessKey
      }
    });
  } catch (error: any) {
    console.error('Handle update error:', error);
    if (error?.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Link email & password to a guest account (auth required; guest only)
router.post('/link-account', auth, async (req, res): Promise<void> => {
  try {
    const user = await User.findById((req as any).user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!user.isGuest) {
      res.status(400).json({ error: 'Account is already linked. Use change-password to update password.' });
      return;
    }
    const { email, accessKey } = req.body;
    if (!email || !accessKey) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (accessKey.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailExists = await User.emailExists(normalizedEmail);
    if (emailExists) {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    user.email = normalizedEmail;
    user.hashedAccessKey = accessKey;
    user.isGuest = false;
    user.emailVerified = false;
    user.emailVerificationPrompted = false; // allow app to show verification modal for this newly linked email
    const verificationToken = EmailService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = expiresAt;
    user.emailVerificationSentAt = new Date();
    await user.save();

    const emailSent = await EmailService.sendVerificationEmail(
      normalizedEmail,
      user.handle,
      verificationToken
    );
    if (!emailSent) {
      console.warn('Link account: verification email failed to send for user', user._id);
    }
    res.json({ success: true, message: 'Account linked successfully' });
  } catch (error) {
    console.error('Link account error:', error);
    res.status(500).json({ error: 'Failed to link account' });
  }
});

// Change password (auth required; full account only)
router.post('/change-password', auth, async (req, res): Promise<void> => {
  try {
    const user = await User.findById((req as any).user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (user.isGuest || !user.hashedAccessKey) {
      res.status(400).json({ error: 'Guest accounts must use link-account to set a password.' });
      return;
    }
    const { currentAccessKey, newAccessKey, verifyNewAccessKey } = req.body;
    if (!currentAccessKey || !newAccessKey || !verifyNewAccessKey) {
      res.status(400).json({ error: 'Current password, new password, and verification are required' });
      return;
    }
    if (newAccessKey.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }
    if (newAccessKey !== verifyNewAccessKey) {
      res.status(400).json({ error: 'New passwords do not match' });
      return;
    }
    const isValid = await user.verifyAccessKey(currentAccessKey);
    if (!isValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    user.hashedAccessKey = newAccessKey;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
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

    if (handle.includes('@')) {
      res.status(400).json({ error: 'Handle cannot contain the @ symbol.', available: false });
      return;
    }

    if (!/^[a-zA-Z0-9!&%^*_]+$/.test(handle)) {
      res.status(400).json({ error: 'Handle can only contain letters, numbers, and !&%^*_', available: false });
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

// Check if Apple ID exists (requires valid Apple ID token to prevent enumeration attacks)
router.post('/check-apple-account', async (req, res): Promise<void> => {
  try {
    const { appleId, identityToken } = req.body;
    
    if (!appleId || typeof appleId !== 'string') {
      res.status(400).json({ error: 'Apple ID is required' });
      return;
    }

    if (!identityToken || typeof identityToken !== 'string') {
      res.status(400).json({ error: 'Apple identity token is required for security' });
      return;
    }

    // Verify the Apple ID token to prevent enumeration attacks
    try {
      const appleUser = await AppleAuthService.verifyToken(identityToken);
      if (!appleUser || appleUser.appleId !== appleId) {
        res.status(401).json({ error: 'Invalid Apple identity token' });
        return;
      }
    } catch (verifyError) {
      console.error('Apple token verification failed:', verifyError);
      res.status(401).json({ error: 'Invalid Apple identity token' });
      return;
    }

    // Check if user exists with this Apple ID (now that we've verified the token)
    const existingUser = await User.findByAppleId(appleId);
    const exists = !!existingUser;
    
    res.json({ 
      exists,
      message: exists ? 'Apple ID account exists' : 'No account found with this Apple ID'
    });
  } catch (error) {
    console.error('Apple account check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if Google ID exists (requires valid Google ID token to prevent enumeration attacks)
router.post('/check-google-account', async (req, res): Promise<void> => {
  try {
    const { googleId, idToken } = req.body;
    
    if (!googleId || typeof googleId !== 'string') {
      res.status(400).json({ error: 'Google ID is required' });
      return;
    }

    if (!idToken || typeof idToken !== 'string') {
      res.status(400).json({ error: 'Google ID token is required for security' });
      return;
    }

    // Verify the Google ID token to prevent enumeration attacks
    try {
      const googleUser = await GoogleAuthService.verifyToken(idToken);
      if (!googleUser || googleUser.googleId !== googleId) {
        res.status(401).json({ error: 'Invalid Google ID token' });
        return;
      }
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError);
      res.status(401).json({ error: 'Invalid Google ID token' });
      return;
    }

    // Check if user exists with this Google ID (now that we've verified the token)
    const existingUser = await User.findByGoogleId(googleId);
    const exists = !!existingUser;
    
    res.json({ 
      exists,
      message: exists ? 'Google ID account exists' : 'No account found with this Google ID'
    });
  } catch (error) {
    console.error('Google account check error:', error);
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret') as { userId: string; sessionId?: string };
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if session is still valid (not invalidated by new login)
    // Only check sessionId if the token has one (new tokens)
    // Old tokens without sessionId are still valid
    if (decoded.sessionId && !user.isTokenValid(decoded.sessionId)) {
      res.status(401).json({ error: 'ACCOUNT_SWITCHED' });
      return;
    }


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
        emailVerified: user.emailVerified || false,
        emailVerificationToken: user.emailVerificationToken || null,
        emailVerificationPrompted: user.emailVerificationPrompted || false,
        debugFeatures: {
          enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
          enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
        },
        isGuest: user.isGuest || false,
        hasPassword: !!(user as any).hashedAccessKey
      }
    });
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('Token verification error: Token expired');
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      if (error.message === 'invalid signature') {
        console.error('Token verification error: Invalid signature - likely environment mismatch (staging token used on dev server or vice versa)');
        console.error('User needs to log out and log back in to get a new token for this environment');
        res.status(401).json({ 
          error: 'Invalid token signature. Please log out and log back in. This usually happens when switching between dev/staging/prod environments.' 
        });
      } else {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
      }
    } else {
      console.error('Token verification error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  }
});

// Email verification endpoints
router.post('/send-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Get the authenticated user from the token
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

    const normalizedIncomingEmail = email.trim().toLowerCase();
    const normalizedCurrentEmail = user.getDecryptedEmail().trim().toLowerCase();
    const isNewEmail = normalizedCurrentEmail !== normalizedIncomingEmail;
    
    if (isNewEmail) {
      const emailExists = await User.emailExists(normalizedIncomingEmail);
      
      if (emailExists) {
        res.status(400).json({ error: 'Please select a new email address or log into the existing account.' });
        return;
      }
      user.emailVerificationNewEmail = EncryptionService.encryptEmail(normalizedIncomingEmail);
    } else {
      user.emailVerificationNewEmail = undefined;
    }

    // Generate verification token
    const verificationToken = EmailService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Update user with verification token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = expiresAt;
    user.emailVerificationSentAt = new Date();
    
    await user.save();

    // Send verification email
    const emailSent = await EmailService.sendVerificationEmail(
      normalizedIncomingEmail,
      user.handle,
      verificationToken
    );

    if (emailSent) {
      res.status(200).json({ message: 'Verification email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/verify-email/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    // Find user by verification token
    const user = await User.findOne({ 
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification Failed - RisingPunk</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
            .container { max-width: 500px; margin: 0 auto; }
            .error { color: #ff6b6b; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Email Verification Failed</h1>
            <p class="error">Invalid or expired verification token.</p>
            <p>Please request a new verification email from the app.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Mark email as verified and clear token
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationSentAt = undefined;
    
    // If this was an email update, update the user's email
    if (user.emailVerificationNewEmail) {
      const decryptedNewEmail = user.getDecryptedEmailVerificationNewEmail();
      if (decryptedNewEmail) {
        user.setEncryptedEmail(decryptedNewEmail);
        user.emailVerificationNewEmail = undefined;
      } else {
        console.error(`Failed to decrypt emailVerificationNewEmail for user ${user._id}. Email update aborted.`);
        res.setHeader('Content-Type', 'text/html');
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Email Verification Error - RisingPunk</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
              .container { max-width: 500px; margin: 0 auto; }
              .error { color: #ff6b6b; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Email Verification Error</h1>
              <p class="error">An error occurred while processing your email verification. Please request a new verification email from the app.</p>
            </div>
          </body>
          </html>
        `);
        return;
      }
    }
    
    await user.save();

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified - RisingPunk</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
          .container { max-width: 500px; margin: 0 auto; }
          .success { color: #51cf66; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #51cf66; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Email Verified Successfully!</h1>
          <p class="success">Your email address has been verified.</p>
          <p>You can now close this window and return to the app.</p>
          <p>Your account is now fully secured and you can recover your password if needed.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Email verification error:', error);
    res.setHeader('Content-Type', 'text/html');
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Error - RisingPunk</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
          .container { max-width: 500px; margin: 0 auto; }
          .error { color: #ff6b6b; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verification Error</h1>
          <p class="error">An error occurred while verifying your email.</p>
          <p>Please try again or contact support.</p>
        </div>
      </body>
      </html>
    `);
  }
});

router.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ emailHash: EncryptionService.hashEmail(email) });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if already verified
    if (user.emailVerified) {
      res.status(400).json({ error: 'Email already verified' });
      return;
    }

    // Check rate limiting (prevent spam)
    const now = new Date();
    const lastSent = user.emailVerificationSentAt;
    if (lastSent && (now.getTime() - lastSent.getTime()) < 60000) { // 1 minute cooldown
      res.status(429).json({ error: 'Please wait before requesting another verification email' });
      return;
    }

    // Generate new verification token
    const verificationToken = EmailService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Update user with new verification token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = expiresAt;
    user.emailVerificationSentAt = new Date();
    await user.save();

    // Send verification email
    const emailSent = await EmailService.sendVerificationEmail(
      user.getDecryptedEmail(),
      user.handle,
      verificationToken
    );

    if (emailSent) {
      res.status(200).json({ message: 'Verification email resent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Password reset endpoints
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ emailHash: EncryptionService.hashEmail(email) });
    if (!user) {
      // Don't reveal if user exists or not for security
      res.status(200).json({ message: 'If the email exists, a password reset link has been sent' });
      return;
    }

    // Check if email is verified
    if (!user.emailVerified) {
      res.status(400).json({ error: 'Email must be verified before resetting password' });
      return;
    }

    // Check if this is a Google account (has googleId but no hashedAccessKey)
    if (user.googleId && !user.hashedAccessKey) {
      res.status(400).json({ error: 'This account uses Google Sign-In. Please use the "Sign in with Google" button instead.' });
      return;
    }
    
    // Check if this is an Apple account (has appleId but no hashedAccessKey)
    if (user.appleId && !user.hashedAccessKey) {
      res.status(400).json({ error: 'This account uses Apple Sign-In. Please use the "Sign in with Apple" button instead.' });
      return;
    }
    

    // Generate password reset token
    const resetToken = EmailService.generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    user.emailVerificationToken = resetToken; // Reuse the same field for password reset
    user.emailVerificationExpires = expiresAt;
    user.emailVerificationSentAt = new Date();
    await user.save();

    // Send password reset email
    const emailSent = await EmailService.sendPasswordResetEmail(
      user.getDecryptedEmail(),
      user.handle,
      resetToken
    );

    if (emailSent) {
      res.status(200).json({ message: 'If the email exists, a password reset link has been sent' });
    } else {
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET endpoint to show password reset form
router.get('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token) {
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Password Reset - RisingPunk</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
            .container { max-width: 500px; margin: 0 auto; }
            .error { color: #ff6b6b; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Password Reset</h1>
            <p class="error">Invalid reset link. Please check your email for the correct link.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Verify token exists and is valid
    const user = await User.findOne({ 
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      res.setHeader('Content-Type', 'text/html');
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Password Reset - RisingPunk</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a1a; color: #fff; }
            .container { max-width: 500px; margin: 0 auto; }
            .error { color: #ff6b6b; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Password Reset</h1>
            <p class="error">Invalid or expired reset token.</p>
            <p>Please request a new password reset from the app.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    // Show password reset form
    res.setHeader('Content-Type', 'text/html');
    
    // Generate a nonce for CSP
    const nonce = require('crypto').randomBytes(16).toString('base64');
    res.setHeader('Content-Security-Policy', `script-src 'self' 'nonce-${nonce}'`);
    
    // Create the JavaScript code with proper token substitution using string concatenation
    const resetScript = `
      document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('resetForm');
        if (form) {
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const message = document.getElementById('message');
            
            if (newPassword !== confirmPassword) {
              message.innerHTML = '<div class="message error">Passwords do not match.</div>';
              return;
            }
            
            if (newPassword.length < 6) {
              message.innerHTML = '<div class="message error">Password must be at least 6 characters long.</div>';
              return;
            }
            
            submitBtn.disabled = true;
            loading.style.display = 'block';
            message.innerHTML = '';
            
            try {
              const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token: '` + token + `',
                  newPassword: newPassword
                })
              });
              
              const data = await response.json();
              
              if (response.ok) {
                message.innerHTML = '<div class="message success">Password reset successfully! You can now close this window and log in with your new password.</div>';
                document.getElementById('resetForm').style.display = 'none';
              } else {
                message.innerHTML = '<div class="message error">' + (data.error || 'Failed to reset password. Please try again.') + '</div>';
              }
            } catch (error) {
              message.innerHTML = '<div class="message error">Network error. Please check your connection and try again.</div>';
            } finally {
              submitBtn.disabled = false;
              loading.style.display = 'none';
            }
          });
        }
      });
    `;
    
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reset Your Password - RisingPunk</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: #1a1a1a; 
            color: #fff; 
            margin: 0; 
            padding: 20px; 
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { 
            max-width: 400px; 
            width: 100%;
            background: #2a2a2a;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          }
          .logo {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 30px;
          }
          .form-group {
            margin-bottom: 20px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
          }
          input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #444;
            border-radius: 8px;
            background: #333;
            color: #fff;
            font-size: 16px;
            box-sizing: border-box;
          }
          input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
          }
          .button {
            width: 100%;
            padding: 14px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }
          .button:hover {
            background: #5a6fd8;
          }
          .button:disabled {
            background: #555;
            cursor: not-allowed;
          }
          .message {
            margin-top: 20px;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
          }
          .success {
            background: #2d5a2d;
            color: #51cf66;
          }
          .error {
            background: #5a2d2d;
            color: #ff6b6b;
          }
          .loading {
            display: none;
            text-align: center;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">RisingPunk</div>
          <h2 style="text-align: center; margin-bottom: 30px;">Reset Your Password</h2>
          <form id="resetForm">
            <div class="form-group">
              <label for="newPassword">New Password</label>
              <input type="password" id="newPassword" required minlength="6">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" required minlength="6">
            </div>
            <button type="submit" class="button" id="submitBtn">Reset Password</button>
            <div class="loading" id="loading">Resetting password...</div>
          </form>
          <div id="message"></div>
        </div>

        <script nonce="${nonce}">${resetScript}</script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Password reset form error:', error);
    res.status(500).send('Server error');
  }
});

// POST endpoint to handle password reset
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    // Find user by reset token
    const user = await User.findOne({ 
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Update password and clear token
    user.hashedAccessKey = newPassword; // Will be hashed by pre-save middleware
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationSentAt = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark user as prompted for email verification
router.post('/mark-email-verification-prompted', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Mark user as prompted for email verification
    user.emailVerificationPrompted = true;
    await user.save();

    res.status(200).json({ 
      message: 'User marked as prompted for email verification',
      emailVerificationPrompted: user.emailVerificationPrompted
    });
  } catch (error) {
    console.error('Mark email verification prompted error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Debug endpoint to verify email (for testing only)
router.get('/debug/email/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Decrypt and show the current email
    const decryptedEmail = user.getDecryptedEmail();
    
          res.status(200).json({
        userId: user._id,
        handle: user.handle,
        currentEmail: decryptedEmail,
        emailHash: user.emailHash,
        emailVerified: user.emailVerified
      });
  } catch (error) {
    console.error('Debug email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 