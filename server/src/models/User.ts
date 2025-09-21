import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { EncryptionService } from '../services/EncryptionService';

export interface IUser extends Document {
  email: string;
  emailHash?: string;
  handle: string;
  hashedAccessKey: string;
  googleId?: string;
  level: number;
  experience: {
    current: number;
    nextLevel: number;
    total: number;
  };
  armyBonus: { strength: number; defense: number; speed: number; health: number };
  balance: {
    total: number;
    ratePerSecond: number;
    lastUpdated: Date;
    fractionalRemainder: number;
    rentalHousingIncomeLastSynced?: Date | null;
  };
  unlockedFeatures: {
    hackRig: boolean;
    researchCenter: boolean;
    rentalHousing1: boolean;
    rentalHousing2: boolean;
    rentalHousing3: boolean;
    rentalHousing4: boolean;
  };
  profileGender: 'male' | 'female';
  onboardingCompleted: boolean;
  needsHandleSelection: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  emailVerificationSentAt?: Date;
  emailVerificationNewEmail?: string;
  emailVerificationPrompted?: boolean;
  debugFeatures?: {
    enableDataRefresh: boolean;
    enableDebugLogs: boolean;
  };
  currentTokenId?: string;
  researchCenterBuild?: {
    startedAt: Date | null;
    completesAt: Date | null;
  };
  rentalHousingBuilds?: {
    property1: { startedAt: Date | null; completesAt: Date | null };
    property2: { startedAt: Date | null; completesAt: Date | null };
    property3: { startedAt: Date | null; completesAt: Date | null };
    property4: { startedAt: Date | null; completesAt: Date | null };
  };
  antivirusShield?: {
    active: boolean;
    startedAt: Date | null;
    completesAt: Date | null;
    cooldownUntil: Date | null;
  };
  verifyAccessKey(accessKey: string): Promise<boolean>;
  getDecryptedEmail(): string;
  setEncryptedEmail(email: string): void;
  setCurrentToken(tokenId: string): void;
  isTokenValid(tokenId: string): boolean;
}

export interface IUserModel extends mongoose.Model<IUser> {
  emailExists(email: string): Promise<boolean>;
  findByGoogleId(googleId: string): Promise<IUser | null>;
}

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  emailHash: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    index: true
  },
  handle: {
    type: String,
    required: true,
    unique: true
  },
  hashedAccessKey: {
    type: String,
    required: false
  },
  googleId: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    index: true
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    current: {
      type: Number,
      default: 0
    },
    nextLevel: {
      type: Number,
      default: 1000
    },
    total: {
      type: Number,
      default: 0
    }
  },
  armyBonus: {
    strength: {
      type: Number,
      default: 0
    },
    defense: {
      type: Number,
      default: 0
    },
    speed: {
      type: Number,
      default: 0
    },
    health: {
      type: Number,
      default: 0
    }
  },
  balance: {
    total: {
      type: Number,
      default: 1000
    },
    ratePerSecond: {
      type: Number,
      default: 1
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    fractionalRemainder: {
      type: Number,
      default: 0
    },
    rentalHousingIncomeLastSynced: {
      type: Date,
      default: null
    }
  },
  unlockedFeatures: {
    hackRig: {
      type: Boolean,
      default: false
    },
    researchCenter: {
      type: Boolean,
      default: false
    },
    rentalHousing1: {
      type: Boolean,
      default: false
    },
    rentalHousing2: {
      type: Boolean,
      default: false
    },
    rentalHousing3: {
      type: Boolean,
      default: false
    },
    rentalHousing4: {
      type: Boolean,
      default: false
    }
  },
  profileGender: {
    type: String,
    enum: ['male', 'female'],
    default: 'male'
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  needsHandleSelection: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    required: false,
    index: true
  },
  emailVerificationExpires: {
    type: Date,
    required: false
  },
  emailVerificationSentAt: {
    type: Date,
    required: false
  },
  emailVerificationNewEmail: {
    type: String,
    required: false
  },
  emailVerificationPrompted: {
    type: Boolean,
    required: false,
    default: false
  },
  debugFeatures: {
    enableDataRefresh: {
      type: Boolean,
      default: false
    },
    enableDebugLogs: {
      type: Boolean,
      default: false
    }
  },
  researchCenterBuild: {
    startedAt: {
      type: Date,
      default: null
    },
    completesAt: {
      type: Date,
      default: null
    }
  },
  rentalHousingBuilds: {
    property1: {
      startedAt: {
        type: Date,
        default: null
      },
      completesAt: {
        type: Date,
        default: null
      }
    },
    property2: {
      startedAt: {
        type: Date,
        default: null
      },
      completesAt: {
        type: Date,
        default: null
      }
    },
    property3: {
      startedAt: {
        type: Date,
        default: null
      },
      completesAt: {
        type: Date,
        default: null
      }
    },
    property4: {
      startedAt: {
        type: Date,
        default: null
      },
      completesAt: {
        type: Date,
        default: null
      }
    }
  },
  antivirusShield: {
    active: {
      type: Boolean,
      default: false
    },
    startedAt: {
      type: Date,
      default: null
    },
    completesAt: {
      type: Date,
      default: null
    },
    cooldownUntil: {
      type: Date,
      default: null
    }
  },
  currentTokenId: {
    type: String,
    required: false
  }
}, { 
  collection: 'users',  // Explicitly name the collection
  timestamps: true      // Add created/updated timestamps
});

// Add password hashing middleware
userSchema.pre('save', async function(this: IUser, next: Function) {
  // Only hash password if it's provided and modified
  if (this.isModified('hashedAccessKey') && this.hashedAccessKey) {
    const salt = await bcrypt.genSalt(12);
    this.hashedAccessKey = await bcrypt.hash(this.hashedAccessKey, salt);
  }
  
  // Encrypt email if it's modified and not already encrypted
  if (this.isModified('email') && !EncryptionService.isEncrypted(this.email)) {
    this.email = EncryptionService.encryptEmail(this.email);
  }
  
  // Generate email hash for efficient duplicate checking
  if (this.isModified('email')) {
    const originalEmail = this.isModified('email') && !EncryptionService.isEncrypted(this.email) 
      ? this.email 
      : this.getDecryptedEmail();
    this.emailHash = EncryptionService.hashEmail(originalEmail);
  }
  
  // Ensure emailHash exists for new users or when updating email
  if (!this.emailHash && this.email) {
    const originalEmail = EncryptionService.isEncrypted(this.email) 
      ? this.getDecryptedEmail() 
      : this.email;
    this.emailHash = EncryptionService.hashEmail(originalEmail);
  }
  
  next();
});

// Add method to verify password
userSchema.methods.verifyAccessKey = async function(accessKey: string): Promise<boolean> {
  return bcrypt.compare(accessKey, this.hashedAccessKey);
};

// Add email encryption/decryption methods
userSchema.methods.getDecryptedEmail = function(): string {
  try {
    // If email is not encrypted, return as-is
    if (!EncryptionService.isEncrypted(this.email)) {
      return this.email;
    }
    return EncryptionService.decryptEmail(this.email);
  } catch (error) {
    console.error('Failed to decrypt email:', error);
    return '';
  }
};

userSchema.methods.setEncryptedEmail = function(email: string): void {
  this.email = EncryptionService.encryptEmail(email);
};

// Static method to check if email exists (for registration validation)
userSchema.statics.emailExists = async function(email: string): Promise<boolean> {
  // Use the email hash for efficient duplicate checking
  const emailHash = EncryptionService.hashEmail(email);
  const existingUser = await this.findOne({ emailHash });
  
  if (existingUser) {
    return true;
  }
  
  // Fall back to checking decrypted emails for users without emailHash (backward compatibility)
  const usersWithoutHash = await this.find({ 
    $or: [
      { emailHash: { $exists: false } },
      { emailHash: null }
    ]
  });
  
  return usersWithoutHash.some((user: IUser) => user.getDecryptedEmail() === email);
};

// Static method to find user by Google ID
userSchema.statics.findByGoogleId = async function(googleId: string): Promise<IUser | null> {
  return this.findOne({ googleId });
};

// Method to set current token (invalidates all previous tokens)
userSchema.methods.setCurrentToken = function(tokenId: string): void {
  this.currentTokenId = tokenId;
};

// Method to check if token is valid
userSchema.methods.isTokenValid = function(tokenId: string): boolean {
  return this.currentTokenId === tokenId;
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema); 