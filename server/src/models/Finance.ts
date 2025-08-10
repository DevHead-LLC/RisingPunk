import mongoose, { Schema, Document, Types } from 'mongoose';

export type TierKey = 'barista' | 'graphic_designer' | 'corporate_lawyer';

export interface IFinanceTier extends Document {
  userId: Types.ObjectId;
  tierKey: TierKey;
  tierName: string;
  story: string;
  incomeStatement: Record<string, number>;
  balanceSheet: {
    assets: Record<string, number>;
    liabilities: Record<string, number>;
    netWorthChange: number;
  };
  cashFlows: {
    operating: Record<string, number>;
    investing: number;
    financing: number;
  };
}

const financeSchema = new Schema<IFinanceTier>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  tierKey: { type: String, required: true, enum: ['barista', 'graphic_designer', 'corporate_lawyer'], index: true },
  tierName: { type: String, required: true },
  story: { type: String, required: true },
  incomeStatement: { type: Schema.Types.Mixed, required: true },
  balanceSheet: {
    assets: { type: Schema.Types.Mixed, required: true },
    liabilities: { type: Schema.Types.Mixed, required: true },
    netWorthChange: { type: Number, required: true },
  },
  cashFlows: {
    operating: { type: Schema.Types.Mixed, required: true },
    investing: { type: Number, required: true },
    financing: { type: Number, required: true },
  },
}, {
  collection: 'financial_tiers',
  timestamps: true,
});

financeSchema.index({ userId: 1, tierKey: 1 }, { unique: true });

export const FinanceTier = mongoose.model<IFinanceTier>('FinanceTier', financeSchema);


