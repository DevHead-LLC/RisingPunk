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
  members: mongoose.Types.ObjectId[];
  executives: mongoose.Types.ObjectId[];
  applicants: ICrewApplicant[];
  crewRules: string[];
  internalMessage: string;
  externalMessage: string;
  warWithCrewId: mongoose.Types.ObjectId | null;
  warDeclaredAt: Date | null;
  allianceWithCrewIds: mongoose.Types.ObjectId[];
  allianceRequestedToCrewIds: mongoose.Types.ObjectId[];
  allianceRequestedFromCrewIds: mongoose.Types.ObjectId[];
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
  }],
  crewRules: {
    type: [String],
    default: []
  },
  internalMessage: {
    type: String,
    maxlength: 1500,
    default: '',
    trim: true
  },
  externalMessage: {
    type: String,
    maxlength: 1500,
    default: '',
    trim: true
  },
  warWithCrewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crew',
    required: false,
    default: null
  },
  warDeclaredAt: {
    type: Date,
    required: false,
    default: null
  },
  allianceWithCrewIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Crew',
    required: false,
    default: []
  },
  allianceRequestedToCrewIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Crew',
    required: false,
    default: []
  },
  allianceRequestedFromCrewIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Crew',
    required: false,
    default: []
  }
}, {
  collection: 'crews',
  timestamps: true
});

crewSchema.index({ crewName: 1 }, { unique: true });
crewSchema.index({ crewIdentifier: 1 }, { unique: true });
crewSchema.index({ presidentId: 1 });
crewSchema.index({ members: 1 });
crewSchema.index({ warWithCrewId: 1 });
crewSchema.index({ allianceWithCrewIds: 1 });

export const Crew = mongoose.model<ICrew>('Crew', crewSchema);

