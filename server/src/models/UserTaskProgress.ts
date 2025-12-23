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
  profileVisitedAt?: Date;
  themeChangedToDarkAt?: Date;
  themeChangedToLightAt?: Date;
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
  }
}, {
  collection: 'usertaskprogress',
  timestamps: true
});

export const UserTaskProgress = mongoose.model<IUserTaskProgress>('UserTaskProgress', userTaskProgressSchema);

