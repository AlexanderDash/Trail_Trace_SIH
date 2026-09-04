/**
 * Bank adapters stay outside the core graph engine.
 * Each source bank (or generic mapper) converts rows into NormalizedTransactionDraft.
 * Do not put SBI/BOB/ICICI branching inside trail, risk, or investigation logic.
 */

export type ColumnMapping = {
  sourceTransactionId: string;
  timestamp: string;
  senderAccount: string;
  receiverAccount: string;
  amount: string;
  transferType?: string;
  senderAccountType?: string;
  receiverAccountType?: string;
  transactionMode?: string;
  locationCity?: string;
  merchant?: string;
};

export type NormalizedTransactionDraft = {
  sourceTransactionId: string;
  sourceBankCode: string;
  timestamp: string;
  senderAccountRef: string;
  receiverAccountRef: string;
  amount: string;
  transferType?: string;
  senderAccountType?: string;
  receiverAccountType?: string;
  transactionMode?: string;
  locationCity?: string;
  merchantName?: string;
  rawPayload: Record<string, unknown>;
};

export type BankAdapter = {
  code: string;
  label: string;
  detect?(headers: string[]): boolean;
  mapRow(row: Record<string, unknown>, mapping: ColumnMapping): NormalizedTransactionDraft;
};

export const GENERIC_ADAPTER_CODE = "GENERIC";
