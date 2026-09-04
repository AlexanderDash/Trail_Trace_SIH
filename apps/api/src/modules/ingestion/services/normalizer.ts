export interface NormalizedTransaction {
  transactionId: string;
  timestamp: Date | null;
  senderAccount: string;
  receiverAccount: string;
  transferType?: string;
  senderAccountType?: string;
  receiverAccountType?: string;
  amount: number;
  transactionMode: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  merchantName?: string;
  sourceRow: any;
}

export interface ValidationResult {
  valid: number;
  invalid: number;
  errors: Array<{ row: number; error: string; data: any }>;
  normalizedData: NormalizedTransaction[];
}

export function parseAmount(amountStr: string | number | null | undefined): number | null {
  if (amountStr === null || amountStr === undefined) return null;
  if (typeof amountStr === 'number') return amountStr;
  
  // Remove commas, spaces, currency symbols
  const cleanStr = amountStr.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed)) return null;
  return parsed;
}

export function parseTimestamp(timeStr: string | number | null | undefined): Date | null {
  if (!timeStr) return null;
  
  // If it's just a time like "10:15:00", we can prepend a dummy date to make it valid for the DB,
  // or use the string directly if we change schema to String for time.
  // The schema says `timestamp DateTime`, so we need a Date object.
  // For now, if it's just HH:mm:ss, attach it to 1970-01-01.
  
  if (typeof timeStr === 'number') {
    // Excel serial date format
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + timeStr * 86400000);
    return date;
  }
  
  const str = timeStr.toString().trim();
  const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
  if (timeRegex.test(str)) {
    return new Date(`1970-01-01T${str}Z`);
  }
  
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  
  return null;
}

export function normalizeData(data: any[], mapping: Record<string, string>): ValidationResult {
  const result: ValidationResult = {
    valid: 0,
    invalid: 0,
    errors: [],
    normalizedData: []
  };

  // Create a reverse mapping: TargetField -> SourceColumn
  const reverseMap: Record<string, string> = {};
  for (const [sourceCol, targetField] of Object.entries(mapping)) {
    reverseMap[targetField] = sourceCol;
  }

  data.forEach((row, index) => {
    // Skip completely empty rows
    if (Object.values(row).every(v => v === null || v === undefined || v === '')) {
      return; // Not even an invalid row, just skip
    }

    const transactionId = row[reverseMap['transactionId']];
    const senderAccount = row[reverseMap['senderAccount']];
    const receiverAccount = row[reverseMap['receiverAccount']];
    const amountRaw = row[reverseMap['amount']];
    const timestampRaw = row[reverseMap['timestamp']];
    const transactionMode = row[reverseMap['transactionMode']];

    let error = null;

    if (!transactionId) error = "Missing Transaction ID";
    else if (!senderAccount) error = "Missing Sender Account";
    else if (!receiverAccount) error = "Missing Receiver Account";
    else if (!amountRaw && amountRaw !== 0) error = "Missing Amount";
    else if (!transactionMode) error = "Missing Transaction Mode";
    else if (!timestampRaw) error = "Missing Timestamp";

    const amount = parseAmount(amountRaw);
    if (amount === null) error = "Invalid Amount Format";

    const timestamp = parseTimestamp(timestampRaw);
    if (!timestamp) error = "Invalid Timestamp Format";

    if (error) {
      result.invalid++;
      result.errors.push({ row: index + 1, error, data: row });
    } else {
      result.valid++;
      result.normalizedData.push({
        transactionId: transactionId.toString(),
        timestamp: timestamp!,
        senderAccount: senderAccount.toString(),
        receiverAccount: receiverAccount.toString(),
        transferType: row[reverseMap['transferType']]?.toString(),
        senderAccountType: row[reverseMap['senderAccountType']]?.toString(),
        receiverAccountType: row[reverseMap['receiverAccountType']]?.toString(),
        amount: amount!,
        transactionMode: transactionMode.toString(),
        city: row[reverseMap['city']]?.toString(),
        latitude: row[reverseMap['latitude']] ? parseFloat(row[reverseMap['latitude']]) : undefined,
        longitude: row[reverseMap['longitude']] ? parseFloat(row[reverseMap['longitude']]) : undefined,
        merchantName: row[reverseMap['merchantName']]?.toString(),
        sourceRow: row
      });
    }
  });

  return result;
}
