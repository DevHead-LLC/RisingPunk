import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { EncryptionService } from '../services/EncryptionService';

export interface IUser extends Document {
  email?: string;
  emailHash?: string;
  handle: string;
  hashedAccessKey?: string;
  isGuest?: boolean;
  googleId?: string;
  appleId?: string;
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
    programmingFacility: boolean;
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
  guestDeviceId?: string;
  /** Stable device identifier (e.g. iOS identifierForVendor) for recovery when AsyncStorage/Keychain is cleared; prefer oldest account by createdAt when multiple guests share same vendor. */
  guestVendorId?: string;
  currentTokenId?: string;
  /** Research Center building level 1–20 (max from construction_config). Missing or 0 = not built (or legacy, resolved on read). */
  researchCenterLevel?: number;
  researchCenterBuild?: {
    startedAt: Date | null;
    completesAt: Date | null;
    /** Target level (1–20) for this build. */
    targetLevel?: number | null;
  };
  rentalHousingBuilds?: {
    property1: { startedAt: Date | null; completesAt: Date | null; targetLevel?: number };
    property2: { startedAt: Date | null; completesAt: Date | null; targetLevel?: number };
    property3: { startedAt: Date | null; completesAt: Date | null; targetLevel?: number };
    property4: { startedAt: Date | null; completesAt: Date | null; targetLevel?: number };
  };
  /** Property level 0 = not built, 1-9 = build level. */
  rentalHousingLevels?: {
    property1: number;
    property2: number;
    property3: number;
    property4: number;
  };
  /** True when level was set by completing a build (so we don't grandfather them to 5). */
  rentalHousingLevelSetByBuild?: {
    property1: boolean;
    property2: boolean;
    property3: boolean;
    property4: boolean;
  };
  /** Room remodel level 1-8 per room (1 = base, 2-8 = remodel tiers). Garage only when property level >= 7. */
  rentalHousingRooms?: {
    property1: { bathroom: number; kitchen: number; bedroom: number; livingRoom: number; garage?: number };
    property2: { bathroom: number; kitchen: number; bedroom: number; livingRoom: number; garage?: number };
    property3: { bathroom: number; kitchen: number; bedroom: number; livingRoom: number; garage?: number };
    property4: { bathroom: number; kitchen: number; bedroom: number; livingRoom: number; garage?: number };
  };
  /** One active remodel at a time (any property). */
  activeRemodel?: {
    propertyId: number;
    room: 'bathroom' | 'kitchen' | 'bedroom' | 'livingRoom' | 'garage';
    startedAt: Date | null;
    completesAt: Date | null;
    targetRoomLevel: number;
  } | null;
  antivirusShield?: {
    active: boolean;
    startedAt: Date | null;
    completesAt: Date | null;
    cooldownUntil: Date | null;
  };
  battleStats?: {
    botsDestroyed: number;
    botsLost: number;
    successfulAttacks: number;
    failedAttacks: number;
    successfulDefenses: number;
    failedDefenses: number;
  };
  totalGuardiansBuilt?: number;
  totalPhreaksBuilt?: number;
  totalBreachersBuilt?: number;
  lifetimeHighNetWorth?: number;
  /** Daily Haul (7-day claim): week boundary, claimed sequence (1→2→…→7), amounts, and last claim date for one-claim-per-UTC-day. */
  dailyHaul?: {
    weekStartUtc: Date;
    claimedDays: number[];
    awardedAmounts?: number[];
    /** Start of UTC day when user last claimed; used to allow only one claim per calendar day. */
    lastClaimedDateUtc?: Date;
  };
  /** Packet Breach: level IDs completed (e.g. ["1.1", "1.2"]). Linear unlock: next level unlocks when prior is completed. */
  packetBreach?: {
    levelsCompleted: string[];
  };
  /** User IDs this user has blocked; affects PM, world chat, and crew chat visibility. */
  blockedUserIds?: mongoose.Types.ObjectId[];
  /** Set by schema timestamps: true. */
  createdAt?: Date;
  updatedAt?: Date;
  verifyAccessKey(accessKey: string): Promise<boolean>;
  getDecryptedEmail(): string;
  getDecryptedEmailVerificationNewEmail(): string;
  setEncryptedEmail(email: string): void;
  setCurrentToken(tokenId: string): void;
  isTokenValid(tokenId: string): boolean;
}

export interface IUserModel extends mongoose.Model<IUser> {
  emailExists(email: string): Promise<boolean>;
  findByEmail(email: string): Promise<IUser | null>;
  findByGoogleId(googleId: string): Promise<IUser | null>;
  findByAppleId(appleId: string): Promise<IUser | null>;
}

const userSchema = new Schema({
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    index: true
  },
  emailHash: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    index: true
  },
  isGuest: {
    type: Boolean,
    default: false
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
  appleId: {
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
    programmingFacility: {
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
  researchCenterLevel: {
    type: Number,
    required: false
  },
  researchCenterBuild: {
    startedAt: {
      type: Date,
      default: null
    },
    completesAt: {
      type: Date,
      default: null
    },
    targetLevel: {
      type: Number,
      default: null
    }
  },
  rentalHousingBuilds: {
    property1: {
      startedAt: { type: Date, default: null },
      completesAt: { type: Date, default: null },
      targetLevel: { type: Number, default: null }
    },
    property2: {
      startedAt: { type: Date, default: null },
      completesAt: { type: Date, default: null },
      targetLevel: { type: Number, default: null }
    },
    property3: {
      startedAt: { type: Date, default: null },
      completesAt: { type: Date, default: null },
      targetLevel: { type: Number, default: null }
    },
    property4: {
      startedAt: { type: Date, default: null },
      completesAt: { type: Date, default: null },
      targetLevel: { type: Number, default: null }
    }
  },
  rentalHousingLevels: {
    property1: { type: Number, default: 0 },
    property2: { type: Number, default: 0 },
    property3: { type: Number, default: 0 },
    property4: { type: Number, default: 0 }
  },
  rentalHousingLevelSetByBuild: {
    property1: { type: Boolean, default: false },
    property2: { type: Boolean, default: false },
    property3: { type: Boolean, default: false },
    property4: { type: Boolean, default: false }
  },
  rentalHousingRooms: {
    property1: {
      bathroom: { type: Number, default: 1 },
      kitchen: { type: Number, default: 1 },
      bedroom: { type: Number, default: 1 },
      livingRoom: { type: Number, default: 1 },
      garage: { type: Number, default: 1 }
    },
    property2: {
      bathroom: { type: Number, default: 1 },
      kitchen: { type: Number, default: 1 },
      bedroom: { type: Number, default: 1 },
      livingRoom: { type: Number, default: 1 },
      garage: { type: Number, default: 1 }
    },
    property3: {
      bathroom: { type: Number, default: 1 },
      kitchen: { type: Number, default: 1 },
      bedroom: { type: Number, default: 1 },
      livingRoom: { type: Number, default: 1 },
      garage: { type: Number, default: 1 }
    },
    property4: {
      bathroom: { type: Number, default: 1 },
      kitchen: { type: Number, default: 1 },
      bedroom: { type: Number, default: 1 },
      livingRoom: { type: Number, default: 1 },
      garage: { type: Number, default: 1 }
    }
  },
  activeRemodel: {
    propertyId: { type: Number, default: null },
    room: { type: String, enum: ['bathroom', 'kitchen', 'bedroom', 'livingRoom', 'garage'], default: null },
    startedAt: { type: Date, default: null },
    completesAt: { type: Date, default: null },
    targetRoomLevel: { type: Number, default: null }
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
  battleStats: {
    botsDestroyed: {
      type: Number,
      default: 0
    },
    botsLost: {
      type: Number,
      default: 0
    },
    successfulAttacks: {
      type: Number,
      default: 0
    },
    failedAttacks: {
      type: Number,
      default: 0
    },
    successfulDefenses: {
      type: Number,
      default: 0
    },
    failedDefenses: {
      type: Number,
      default: 0
    }
  },
  totalGuardiansBuilt: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000000
  },
  totalPhreaksBuilt: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000000
  },
  totalBreachersBuilt: {
    type: Number,
    default: 0,
    min: 0,
    max: 1000000
  },
  lifetimeHighNetWorth: {
    type: Number,
    default: 0,
    min: 0
  },
  /** Stable device identifier for "one guest per device"; used by POST /auth/guest get-or-create. Unique per device (sparse so nulls are allowed). */
  guestDeviceId: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  /** Stable vendor/device id for recovery when client loses guestDeviceId; sparse index for lookup. */
  guestVendorId: {
    type: String,
    required: false,
    sparse: true,
    index: true
  },
  currentTokenId: {
    type: String,
    required: false
  },
  dailyHaul: {
    weekStartUtc: { type: Date, required: false },
    claimedDays: { type: [Number], default: [] },
    awardedAmounts: { type: [Number], default: undefined },
    lastClaimedDateUtc: { type: Date, required: false }
  },
  packetBreach: {
    levelsCompleted: { type: [String], default: [] }
  },
  blockedUserIds: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: []
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
  
  // Get the original email before any modifications (guests may have no email)
  let originalEmail: string;
  if (this.isModified('email')) {
    if (!this.email) {
      originalEmail = '';
    } else if (!EncryptionService.isEncrypted(this.email)) {
      // Email is not encrypted yet, normalize it
      originalEmail = this.email.trim().toLowerCase();
      this.email = EncryptionService.encryptEmail(originalEmail);
    } else {
      // Email is already encrypted, decrypt to get original
      originalEmail = this.getDecryptedEmail();
    }
  } else if (this.email) {
    // Email not modified, but we need to ensure it's encrypted and emailHash exists
    if (EncryptionService.isEncrypted(this.email)) {
      originalEmail = this.getDecryptedEmail();
    } else {
      // Email is plaintext but not marked as modified - encrypt it now
      originalEmail = this.email.trim().toLowerCase();
      this.email = EncryptionService.encryptEmail(originalEmail);
    }
  } else {
    originalEmail = '';
  }
  
  if (originalEmail) {
    this.emailHash = EncryptionService.hashEmail(originalEmail);
  }
  
  next();
});

// Add method to verify password (guest accounts have no password)
userSchema.methods.verifyAccessKey = async function(accessKey: string): Promise<boolean> {
  if (!this.hashedAccessKey) return false;
  return bcrypt.compare(accessKey, this.hashedAccessKey);
};

// Add email encryption/decryption methods
userSchema.methods.getDecryptedEmail = function(): string {
  try {
    if (!this.email) return '';
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

userSchema.methods.getDecryptedEmailVerificationNewEmail = function(): string {
  try {
    if (!this.emailVerificationNewEmail) {
      return '';
    }
    if (!EncryptionService.isEncrypted(this.emailVerificationNewEmail)) {
      return this.emailVerificationNewEmail;
    }
    return EncryptionService.decryptEmail(this.emailVerificationNewEmail);
  } catch (error) {
    console.error('Failed to decrypt emailVerificationNewEmail:', error);
    return '';
  }
};

userSchema.statics.emailExists = async function(email: string): Promise<boolean> {
  return (await (this as IUserModel).findByEmail(email)) !== null;
};

// Find user by email. Uses emailHash when present; falls back to decrypt-and-compare for users without emailHash (legacy).
userSchema.statics.findByEmail = async function(email: string): Promise<IUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = EncryptionService.hashEmail(normalizedEmail);
  const byHash = await this.findOne({ emailHash });
  if (byHash) {
    return byHash;
  }
  const usersWithoutHash = await this.find({
    $or: [
      { emailHash: { $exists: false } },
      { emailHash: null }
    ]
  });
  const match = usersWithoutHash.find((user: IUser) => {
    const decrypted = user.getDecryptedEmail().trim().toLowerCase();
    return decrypted === normalizedEmail;
  });
  return match ?? null;
};

// Static method to find user by Google ID
userSchema.statics.findByGoogleId = async function(googleId: string): Promise<IUser | null> {
  return this.findOne({ googleId });
};

// Static method to find user by Apple ID
userSchema.statics.findByAppleId = async function(appleId: string): Promise<IUser | null> {
  return this.findOne({ appleId });
};

// Method to set current token (invalidates all previous tokens)
userSchema.methods.setCurrentToken = function(tokenId: string): void {
  this.currentTokenId = tokenId;
};

// Method to check if token is valid
userSchema.methods.isTokenValid = function(tokenId: string): boolean {
  return this.currentTokenId === tokenId;
};

userSchema.index({ 'battleStats.botsDestroyed': -1 });
userSchema.index({ 'balance.total': -1 });

export const User = mongoose.model<IUser, IUserModel>('User', userSchema); 