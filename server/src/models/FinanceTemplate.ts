import mongoose, { Schema, Document } from 'mongoose';

export type TierKey = 'barista' | 'graphic_designer' | 'corporate_lawyer';

export interface IFinanceTemplate extends Document {
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

const financeTemplateSchema = new Schema<IFinanceTemplate>({
  tierKey: { type: String, required: true, unique: true, enum: ['barista', 'graphic_designer', 'corporate_lawyer'] },
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
  collection: 'finance_tier_templates',
  timestamps: true,
});

export const FinanceTemplate = mongoose.model<IFinanceTemplate>('FinanceTemplate', financeTemplateSchema);


