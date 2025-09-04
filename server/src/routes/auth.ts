import express, { Request, Response, Router, NextFunction } from 'express';
import { User } from '../models/User';
import { Research } from '../models/Research';
import { ResearchUser } from '../models/ResearchUser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { GoogleAuthService } from '../services/GoogleAuthService';
import { EmailService } from '../services/EmailService';
import { EncryptionService } from '../services/EncryptionService';

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
    emailVerified: boolean;
    emailVerificationToken?: string | null;
    emailVerificationPrompted?: boolean;
    debugFeatures?: {
      enableDataRefresh: boolean;
      enableDebugLogs: boolean;
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
          needsHandleSelection: user.needsHandleSelection || false,
          emailVerified: user.emailVerified || false,
          emailVerificationToken: user.emailVerificationToken || null,
          emailVerificationPrompted: user.emailVerificationPrompted || false,
          debugFeatures: {
            enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
            enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
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
          emailVerified: user.emailVerified || false,
          emailVerificationToken: user.emailVerificationToken || null,
          emailVerificationPrompted: user.emailVerificationPrompted || false,
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
            emailVerified: user.emailVerified || false,
          emailVerificationToken: user.emailVerificationToken || null,
          emailVerificationPrompted: user.emailVerificationPrompted || false,
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
              needsHandleSelection: user.needsHandleSelection || false,
              emailVerified: user.emailVerified || false,
          emailVerificationToken: user.emailVerificationToken || null,
          emailVerificationPrompted: user.emailVerificationPrompted || false,
              debugFeatures: {
                enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
                enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
              }
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
        needsHandleSelection: true,
        emailVerified: true // Google Sign-In users have verified emails
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
          needsHandleSelection: user.needsHandleSelection || false,
          emailVerified: user.emailVerified || false,
          emailVerificationToken: user.emailVerificationToken || null,
          emailVerificationPrompted: user.emailVerificationPrompted || false,
          debugFeatures: {
            enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
            enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
          }
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
        needsHandleSelection: user.needsHandleSelection || false,
        emailVerified: user.emailVerified || false,
        debugFeatures: {
          enableDataRefresh: user.debugFeatures?.enableDataRefresh || false,
          enableDebugLogs: user.debugFeatures?.enableDebugLogs || false
        }
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
        emailVerified: user.emailVerified || false,
        emailVerificationToken: user.emailVerificationToken || null,
        emailVerificationPrompted: user.emailVerificationPrompted || false,
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

    // Check if the email is already in use by another user
    const emailExists = await User.emailExists(email);
    console.log('🔵 SERVER: Email existence check:', {
      email: email,
      emailExists: emailExists,
      currentUser: user.handle
    });
    
    if (emailExists) {
      console.log('🔴 SERVER: Email already exists:', email);
      res.status(400).json({ error: 'Please select a new email address or log into the existing account.' });
      return;
    }

    // Check if this is a new email (different from current user's email)
    const isNewEmail = user.getDecryptedEmail() !== email;
    
    if (isNewEmail) {
      // Store the new email temporarily (will be confirmed after verification)
      user.emailVerificationNewEmail = email;
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
      email, // Use the email from the request (new email if updating)
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
      user.email = user.emailVerificationNewEmail;
      user.emailHash = EncryptionService.hashEmail(user.emailVerificationNewEmail);
      user.emailVerificationNewEmail = undefined;
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