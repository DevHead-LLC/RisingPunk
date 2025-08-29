import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  handle: string;
  hashedAccessKey: string;
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
  verifyAccessKey(accessKey: string): Promise<boolean>;
}

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  handle: {
    type: String,
    required: true,
    unique: true
  },
  hashedAccessKey: {
    type: String,
    required: true
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
  }
}, { 
  collection: 'users',  // Explicitly name the collection
  timestamps: true      // Add created/updated timestamps
});

// Add password hashing middleware
userSchema.pre('save', async function(this: IUser, next: Function) {
  if (this.isModified('hashedAccessKey')) {
    const salt = await bcrypt.genSalt(12);
    this.hashedAccessKey = await bcrypt.hash(this.hashedAccessKey, salt);
  }
  next();
});

// Add method to verify password
userSchema.methods.verifyAccessKey = async function(accessKey: string): Promise<boolean> {
  return bcrypt.compare(accessKey, this.hashedAccessKey);
};

export const User = mongoose.model<IUser>('User', userSchema); 