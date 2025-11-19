import mongoose, { Schema, Document } from 'mongoose';

export interface ICrewApplicant {
  userId: mongoose.Types.ObjectId;
  handle: string;
  appliedAt: Date;
}

export interface ICrew extends Document {
  crewName: string;
  crewIdentifier: string;
  nativeLanguage: string;
  presidentId: mongoose.Types.ObjectId;
  President: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  executives: mongoose.Types.ObjectId[];
  applicants: ICrewApplicant[];
  createdAt: Date;
  updatedAt: Date;
}

const crewSchema = new Schema({
  crewName: {
    type: String,
    required: true,
    maxlength: 12,
    trim: true
  },
  crewIdentifier: {
    type: String,
    required: true,
    maxlength: 5,
    uppercase: true,
    trim: true
  },
  nativeLanguage: {
    type: String,
    required: true
  },
  presidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  executives: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  President: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    handle: {
      type: String,
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  collection: 'crews',
  timestamps: true
});

crewSchema.index({ crewName: 1 }, { unique: true });
crewSchema.index({ crewIdentifier: 1 }, { unique: true });
crewSchema.index({ presidentId: 1 });
crewSchema.index({ members: 1 });

export const Crew = mongoose.model<ICrew>('Crew', crewSchema);

