import mongoose, { Schema, Document } from 'mongoose';

export interface IUserTaskProgress extends Document {
  userId: mongoose.Types.ObjectId;
  completedTasks: {
    taskId: string;
    completedAt: Date;
  }[];
  skippedTasks: string[];
  lastCompletedTaskId?: string;
  showTaskGuide: boolean;
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
  }
}, {
  collection: 'usertaskprogress',
  timestamps: true
});

export const UserTaskProgress = mongoose.model<IUserTaskProgress>('UserTaskProgress', userTaskProgressSchema);

