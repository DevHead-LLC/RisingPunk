import mongoose, { Schema, Document } from 'mongoose';

export interface IUserTaskProgress extends Document {
  userId: mongoose.Types.ObjectId;
  completedTasks: {
    taskId: string;
    completedAt: Date;
  }[];
  collectedTasks: string[]; // Tasks that have had their reward collected
  skippedTasks: string[];
  lastCompletedTaskId?: string;
  showTaskGuide: boolean;
  taskGuidePillTappedOnce?: boolean;
  profileVisitedAt?: Date;
  themeChangedToDarkAt?: Date;
  themeChangedToLightAt?: Date;
  avatarChangedAt?: Date;
  taskGuideShownAt?: Date;
  homeVisitedAt?: Date;
  hackmapVisitedAt?: Date;
  digitalBarracksVisitedAt?: Date;
  walletViewedAt?: Date;
  attackedLevel1NpcAt?: Date;
  visitedAnotherUserProfileAt?: Date;
  homeDefenseUnlockedAt?: Date;
  antivirusUnlockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userTaskProgressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true
  },
  completedTasks: [{
    taskId: {
      type: String,
      required: true
    },
    completedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  }],
  collectedTasks: [{
    type: String
  }],
  skippedTasks: [{
    type: String
  }],
  lastCompletedTaskId: {
    type: String,
    required: false
  },
  showTaskGuide: {
    type: Boolean,
    default: true
  },
  taskGuidePillTappedOnce: {
    type: Boolean,
    required: false,
    default: false
  },
  profileVisitedAt: {
    type: Date,
    required: false
  },
  themeChangedToDarkAt: {
    type: Date,
    required: false
  },
  themeChangedToLightAt: {
    type: Date,
    required: false
  },
  avatarChangedAt: {
    type: Date,
    required: false
  },
  taskGuideShownAt: {
    type: Date,
    required: false
  },
  homeVisitedAt: {
    type: Date,
    required: false
  },
  hackmapVisitedAt: {
    type: Date,
    required: false
  },
  digitalBarracksVisitedAt: {
    type: Date,
    required: false
  },
  walletViewedAt: {
    type: Date,
    required: false
  },
  attackedLevel1NpcAt: {
    type: Date,
    required: false
  },
  visitedAnotherUserProfileAt: {
    type: Date,
    required: false
  },
  homeDefenseUnlockedAt: {
    type: Date,
    required: false
  },
  antivirusUnlockedAt: {
    type: Date,
    required: false
  }
}, {
  collection: 'usertaskprogress',
  timestamps: true
});

export const UserTaskProgress = mongoose.model<IUserTaskProgress>('UserTaskProgress', userTaskProgressSchema);

