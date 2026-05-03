import { NotificationTypeV2 } from '@apple/app-store-server-library';
import { createAppleSignedDataVerifier } from './IapAppleSignedTransactionVerifier';
import { applyAppleRefundForTransactionIdIfPresent } from './iapDeveloperSupportService';

/**
 * App Store Server Notifications V2 — verify signed outer payload, then reconcile Developer Support ledger on refunds.
 */
export async function handleAppleAssnV2SignedPayload(signedPayload: string): Promise<{ handled: boolean; detail: string }> {
  const verifier = createAppleSignedDataVerifier();
  const outer = await verifier.verifyAndDecodeNotification(signedPayload);
  const type = outer.notificationType;
  if (
    type !== NotificationTypeV2.REFUND &&
    type !== 'REFUND' &&
    type !== NotificationTypeV2.REVOKE &&
    type !== 'REVOKE'
  ) {
    return { handled: true, detail: `no-op notificationType=${String(type)}` };
  }
  const signedTx = outer.data?.signedTransactionInfo;
  if (!signedTx) {
    return { handled: false, detail: 'missing data.signedTransactionInfo' };
  }
  const inner = await verifier.verifyAndDecodeTransaction(signedTx);
  const transactionId = inner.transactionId;
  if (!transactionId) {
    return { handled: false, detail: 'missing transactionId in signed transaction' };
  }
  const updated = await applyAppleRefundForTransactionIdIfPresent(transactionId);
  return { handled: true, detail: updated ? `refund applied ${transactionId}` : `no ledger row ${transactionId}` };
}
