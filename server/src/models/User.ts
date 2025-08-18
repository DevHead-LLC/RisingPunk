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
  balance: {
    total: number;
    ratePerSecond: number;
    lastUpdated: Date;
  };
  unlockedFeatures: {
    hackRig: boolean;
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