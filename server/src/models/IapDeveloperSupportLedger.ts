import mongoose, { Schema, Document, Model } from 'mongoose';
import { IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER } from '../../../shared/iapCatalog';

export type IapStorePlatform = 'apple' | 'google';

export interface IIapDeveloperSupportLedger extends Document {
  userId: mongoose.Types.ObjectId;
  platform: IapStorePlatform;
  storeProductId: string;
  /** Canonical dedupe id per platform (Apple transactionId; Google orderId when present else purchaseToken). */
  transactionId: string;
  currency: string;
  amountMinorUnits: number;
  remainingMinorUnits: number;
  entitlementKey: typeof IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER;
  createdAt: Date;
  updatedAt: Date;
}

const IapDeveloperSupportLedgerSchema = new Schema<IIapDeveloperSupportLedger>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, required: true, enum: ['apple', 'google'] },
    storeProductId: { type: String, required: true },
    transactionId: { type: String, required: true },
    currency: { type: String, required: true },
    amountMinorUnits: { type: Number, required: true },
    remainingMinorUnits: { type: Number, required: true },
    entitlementKey: {
      type: String,
      required: true,
      enum: [IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER],
    },
  },
  { timestamps: true },
);

IapDeveloperSupportLedgerSchema.index({ platform: 1, transactionId: 1 }, { unique: true });
IapDeveloperSupportLedgerSchema.index({ userId: 1, createdAt: -1 });

export const IapDeveloperSupportLedger: Model<IIapDeveloperSupportLedger> =
  mongoose.models.IapDeveloperSupportLedger ||
  mongoose.model<IIapDeveloperSupportLedger>('IapDeveloperSupportLedger', IapDeveloperSupportLedgerSchema);
