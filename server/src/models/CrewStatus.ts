import mongoose, { Schema, Document } from 'mongoose';

export interface ICrewStatus extends Document {
  userId: mongoose.Types.ObjectId;
  isInCrew: boolean;
  crewId: mongoose.Types.ObjectId | null;
  crewIdentifier: string | null;
  role: 'president' | 'member' | 'executive' | null;
  appliedCrewId: mongoose.Types.ObjectId | null;
  appliedCrewIdentifier: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const crewStatusSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isInCrew: {
    type: Boolean,
    default: false
  },
  crewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crew',
    default: null
  },
  crewIdentifier: {
    type: String,
    default: null,
    maxlength: 5
  },
  role: {
    type: String,
    enum: ['president', 'member', 'executive', null],
    default: null
  },
  appliedCrewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crew',
    default: null
  },
  appliedCrewIdentifier: {
    type: String,
    default: null,
    maxlength: 5
  }
}, {
  collection: 'crewStatus',
  timestamps: true
});

crewStatusSchema.index({ userId: 1 }, { unique: true });
crewStatusSchema.index({ crewId: 1 });

export const CrewStatus = mongoose.model<ICrewStatus>('CrewStatus', crewStatusSchema);

