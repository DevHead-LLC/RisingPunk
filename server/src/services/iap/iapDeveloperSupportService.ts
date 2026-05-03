import mongoose from 'mongoose';
import type { JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import { Type } from '@apple/app-store-server-library';
import {
  findIapCatalogEntryByStoreProductId,
  IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER,
} from '../../../../shared/iapCatalog';
import { IapDeveloperSupportLedger, type IIapDeveloperSupportLedger } from '../../models/IapDeveloperSupportLedger';
import { User } from '../../models/User';
import { createAppleSignedDataVerifier } from './IapAppleSignedTransactionVerifier';
import { getGooglePlayProductPurchase } from './googlePlayProductPurchase';
import { sendSystemNotificationDm } from '../CrewSystemNotificationService';
import { EmailService, type EmailTemplate } from '../EmailService';
import { normalizeCurrencyCode } from './iapCurrency';

function assertCatalogProduct(productId: string | undefined) {
  if (!productId) {
    throw new Error('IAP verify: missing product id');
  }
  const row = findIapCatalogEntryByStoreProductId(productId);
  if (!row) {
    throw new Error(`IAP verify: product id not in v1 catalog: ${productId}`);
  }
  return row;
}

function requireProductId(productId: string | undefined): string {
  const row = assertCatalogProduct(productId);
  return row.appleProductId;
}

/** Apple JWS `price` is in milliunits of the major currency unit; convert to ISO 4217 minor units (e.g. USD cents). */
function appleMilliunitsToMinorUnits(priceMilliunits: number): number {
  if (!Number.isFinite(priceMilliunits)) {
    throw new Error('IAP verify: Apple price is not a finite number');
  }
  return Math.round(priceMilliunits / 10);
}

function googleMicrosToMinorUnits(microsStr: string | undefined): number {
  if (!microsStr) {
    throw new Error('IAP verify: Google priceAmountMicros missing from Play API response');
  }
  const micros = Number(microsStr);
  if (!Number.isFinite(micros)) {
    throw new Error('IAP verify: Google priceAmountMicros is not numeric');
  }
  return Math.round(micros / 10000);
}

async function sendThankYouDm(userId: string): Promise<void> {
  await sendSystemNotificationDm(userId, 'Thank you for your support.');
}

async function maybeSendReceiptEmail(params: {
  userId: string;
  platform: 'apple' | 'google';
  storeProductId: string;
  transactionId: string;
  currency: string;
  amountMinorUnits: number;
}): Promise<void> {
  const user = await User.findById(params.userId).select('email emailVerified handle').lean();
  if (!user?.email || !user.emailVerified) {
    return;
  }
  const subject = 'RisingPunk — Developer Support purchase receipt';
  const text = [
    `Hi ${user.handle || 'player'},`,
    '',
    'This email confirms a Developer Support purchase recorded on your RisingPunk account.',
    `Platform: ${params.platform}`,
    `Product: ${params.storeProductId}`,
    `Transaction id: ${params.transactionId}`,
    `Amount: ${params.amountMinorUnits} minor units ${params.currency} (see in-game history for display formatting).`,
    '',
    'Official tax/receipt records may also be available from Apple App Store purchase history or Google Play order history.',
    '',
    '— RisingPunk',
  ].join('\n');
  const template: EmailTemplate = { subject, text, html: `<pre>${text.replace(/</g, '&lt;')}</pre>` };
  try {
    await EmailService.sendEmail(user.email, template);
  } catch (err) {
    console.warn('IAP receipt email failed:', err);
  }
}

async function insertLedgerOrReturnExisting(doc: {
  userId: mongoose.Types.ObjectId;
  platform: 'apple' | 'google';
  storeProductId: string;
  transactionId: string;
  currency: string;
  amountMinorUnits: number;
  remainingMinorUnits: number;
  entitlementKey: typeof IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER;
}): Promise<{ row: IIapDeveloperSupportLedger; inserted: boolean }> {
  try {
    const created = await IapDeveloperSupportLedger.create(doc);
    await sendThankYouDm(String(doc.userId));
    await maybeSendReceiptEmail({
      userId: String(doc.userId),
      platform: doc.platform,
      storeProductId: doc.storeProductId,
      transactionId: doc.transactionId,
      currency: doc.currency,
      amountMinorUnits: doc.amountMinorUnits,
    });
    return { row: created, inserted: true };
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      const existing = await IapDeveloperSupportLedger.findOne({
        platform: doc.platform,
        transactionId: doc.transactionId,
      });
      if (!existing) {
        throw err;
      }
      if (String(existing.userId) !== String(doc.userId)) {
        throw new Error(
          'IAP verify: this store transaction is already recorded for a different RisingPunk account',
        );
      }
      return { row: existing, inserted: false };
    }
    throw err;
  }
}

function assertAppleConsumable(decoded: JWSTransactionDecodedPayload) {
  const t = decoded.type;
  if (t !== Type.CONSUMABLE && t !== 'Consumable') {
    throw new Error(`IAP verify: Apple transaction is not a consumable (type=${String(t)})`);
  }
  if (decoded.revocationDate != null) {
    throw new Error('IAP verify: Apple transaction is revoked; cannot grant');
  }
}

function readAppleLineMinorUnits(decoded: JWSTransactionDecodedPayload): number {
  const price = decoded.price;
  if (price == null) {
    throw new Error('IAP verify: Apple price missing from JWS');
  }
  const unitMinor = appleMilliunitsToMinorUnits(price);
  const qtyRaw = decoded.quantity;
  const qty = qtyRaw != null && Number.isFinite(Number(qtyRaw)) ? Math.max(1, Math.floor(Number(qtyRaw))) : 1;
  const line = unitMinor * qty;
  if (!Number.isFinite(line) || line < 0) {
    throw new Error('IAP verify: Apple amount computation invalid');
  }
  return line;
}

export async function verifyAppleDeveloperSupport(params: {
  userId: string;
  signedTransactionInfo: string;
}): Promise<{ ledgerId: string; supporter: boolean; duplicate: boolean }> {
  if (!mongoose.Types.ObjectId.isValid(params.userId)) {
    throw new Error('IAP verify: invalid user id');
  }
  const verifier = createAppleSignedDataVerifier();
  const decoded = await verifier.verifyAndDecodeTransaction(params.signedTransactionInfo);
  assertAppleConsumable(decoded);
  const storeProductId = requireProductId(decoded.productId);
  const transactionId = decoded.transactionId;
  if (!transactionId) {
    throw new Error('IAP verify: Apple transactionId missing from JWS');
  }
  const currency = normalizeCurrencyCode(decoded.currency);
  const amountMinorUnits = readAppleLineMinorUnits(decoded);
  const userOid = new mongoose.Types.ObjectId(params.userId);
  const { row, inserted } = await insertLedgerOrReturnExisting({
    userId: userOid,
    platform: 'apple',
    storeProductId,
    transactionId,
    currency,
    amountMinorUnits,
    remainingMinorUnits: amountMinorUnits,
    entitlementKey: IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER,
  });
  const supporter = await computeDeveloperSupportSupporter(params.userId);
  return { ledgerId: String(row._id), supporter, duplicate: !inserted };
}

/** Heuristic: first insert sets createdAt === updatedAt; duplicate key path returns existing without new thank-you. */
export async function verifyGoogleDeveloperSupport(params: {
  userId: string;
  productId: string;
  purchaseToken: string;
}): Promise<{ ledgerId: string; supporter: boolean; duplicate: boolean }> {
  if (!mongoose.Types.ObjectId.isValid(params.userId)) {
    throw new Error('IAP verify: invalid user id');
  }
  assertCatalogProduct(params.productId);
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) {
    throw new Error('GOOGLE_PLAY_PACKAGE_NAME is not set');
  }
  const gp = await getGooglePlayProductPurchase({
    packageName,
    productId: params.productId,
    purchaseToken: params.purchaseToken,
  });
  if (gp.purchaseState !== 0) {
    throw new Error(`IAP verify: Google purchase not in purchased state (purchaseState=${String(gp.purchaseState)})`);
  }
  const transactionId = gp.orderId && gp.orderId.length > 0 ? gp.orderId : params.purchaseToken;
  if (gp.consumptionState === 1) {
    const existing = await IapDeveloperSupportLedger.findOne({
      platform: 'google',
      transactionId,
    });
    if (!existing) {
      throw new Error('IAP verify: Google purchase is already consumed; cannot grant again');
    }
    if (String(existing.userId) !== params.userId) {
      throw new Error(
        'IAP verify: this store transaction is already recorded for a different RisingPunk account',
      );
    }
    const supporter = await computeDeveloperSupportSupporter(params.userId);
    return { ledgerId: String(existing._id), supporter, duplicate: true };
  }
  const currency = normalizeCurrencyCode(gp.priceCurrencyCode);
  const unitMinor = googleMicrosToMinorUnits(gp.priceAmountMicros);
  const qtyRaw = gp.quantity;
  const qty = qtyRaw != null && Number.isFinite(Number(qtyRaw)) ? Math.max(1, Math.floor(Number(qtyRaw))) : 1;
  const amountMinorUnits = unitMinor * qty;
  if (!Number.isFinite(amountMinorUnits) || amountMinorUnits < 0) {
    throw new Error('IAP verify: Google amount computation invalid');
  }
  const userOid = new mongoose.Types.ObjectId(params.userId);
  const { row, inserted } = await insertLedgerOrReturnExisting({
    userId: userOid,
    platform: 'google',
    storeProductId: params.productId,
    transactionId,
    currency,
    amountMinorUnits,
    remainingMinorUnits: amountMinorUnits,
    entitlementKey: IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER,
  });
  const supporter = await computeDeveloperSupportSupporter(params.userId);
  return { ledgerId: String(row._id), supporter, duplicate: !inserted };
}

export async function computeDeveloperSupportSupporter(userId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('IAP: invalid user id');
  }
  const pos = await IapDeveloperSupportLedger.exists({
    userId: new mongoose.Types.ObjectId(userId),
    entitlementKey: IAP_ENTITLEMENT_DEVELOPER_SUPPORT_SUPPORTER,
    remainingMinorUnits: { $gt: 0 },
  });
  return Boolean(pos);
}

export type IapLedgerRowWire = {
  id: string;
  platform: string;
  storeProductId: string;
  transactionId: string;
  currency: string;
  amountMinorUnits: number;
  remainingMinorUnits: number;
  createdAt: string;
};

/** Single read: ledger rows + supporter flag (avoids a second round-trip and keeps the pair consistent). */
export async function listDeveloperSupportLedgerWithSupporter(userId: string): Promise<{
  supporter: boolean;
  rows: IapLedgerRowWire[];
}> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('IAP: invalid user id');
  }
  const oid = new mongoose.Types.ObjectId(userId);
  const rows = await IapDeveloperSupportLedger.find({ userId: oid }).sort({ createdAt: -1 }).limit(200).lean();
  const supporter = rows.some((r) => (r.remainingMinorUnits ?? 0) > 0);
  return {
    supporter,
    rows: rows.map((r) => ({
      id: String(r._id),
      platform: r.platform,
      storeProductId: r.storeProductId,
      transactionId: r.transactionId,
      currency: r.currency,
      amountMinorUnits: r.amountMinorUnits,
      remainingMinorUnits: r.remainingMinorUnits,
      createdAt: (r as { createdAt?: Date }).createdAt?.toISOString() ?? '',
    })),
  };
}

export async function applyAppleRefundForTransactionIdIfPresent(transactionId: string): Promise<boolean> {
  const res = await IapDeveloperSupportLedger.findOneAndUpdate(
    { platform: 'apple', transactionId },
    { $set: { remainingMinorUnits: 0 } },
    { new: true },
  );
  return Boolean(res);
}
