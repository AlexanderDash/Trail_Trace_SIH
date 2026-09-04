import { GENERIC_ADAPTER_CODE, type BankAdapter, type ColumnMapping, type NormalizedTransactionDraft } from "./types.js";

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

const genericAdapter: BankAdapter = {
  code: GENERIC_ADAPTER_CODE,
  label: "Generic column-mapped adapter",
  mapRow(row, mapping: ColumnMapping): NormalizedTransactionDraft {
    return {
      sourceTransactionId: asString(row[mapping.sourceTransactionId]),
      sourceBankCode: GENERIC_ADAPTER_CODE,
      timestamp: asString(row[mapping.timestamp]),
      senderAccountRef: asString(row[mapping.senderAccount]),
      receiverAccountRef: asString(row[mapping.receiverAccount]),
      amount: asString(row[mapping.amount]),
      transferType: mapping.transferType ? asString(row[mapping.transferType]) : undefined,
      senderAccountType: mapping.senderAccountType ? asString(row[mapping.senderAccountType]) : undefined,
      receiverAccountType: mapping.receiverAccountType ? asString(row[mapping.receiverAccountType]) : undefined,
      transactionMode: mapping.transactionMode ? asString(row[mapping.transactionMode]) : undefined,
      locationCity: mapping.locationCity ? asString(row[mapping.locationCity]) : undefined,
      merchantName: mapping.merchant ? asString(row[mapping.merchant]) : undefined,
      rawPayload: row,
    };
  },
};

const adapters = new Map<string, BankAdapter>([[genericAdapter.code, genericAdapter]]);

export function getAdapter(code?: string): BankAdapter {
  if (code && adapters.has(code)) {
    return adapters.get(code)!;
  }
  return genericAdapter;
}

export function listAdapters(): BankAdapter[] {
  return [...adapters.values()];
}

export function registerAdapter(adapter: BankAdapter): void {
  adapters.set(adapter.code, adapter);
}
