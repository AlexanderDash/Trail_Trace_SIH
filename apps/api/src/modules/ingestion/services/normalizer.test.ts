import { describe, it, expect } from 'vitest';
import { normalizeData, parseAmount, parseTimestamp } from './normalizer.js';

describe('Normalizer Service', () => {
  it('parses amounts correctly', () => {
    expect(parseAmount('2,50,000')).toBe(250000);
    expect(parseAmount('95,000')).toBe(95000);
    expect(parseAmount('480000')).toBe(480000);
    expect(parseAmount('450000.50')).toBe(450000.50);
    expect(parseAmount(100)).toBe(100);
    expect(parseAmount('invalid')).toBe(null);
  });

  it('parses timestamps correctly', () => {
    const timeOnly = parseTimestamp('10:15:00');
    expect(timeOnly?.toISOString()).toContain('T10:15:00.000Z');
    
    const excelTime = parseTimestamp(45000); 
    expect(excelTime).toBeInstanceOf(Date);
  });

  it('normalizes valid transaction data', () => {
    const data = [{
      txn_id: 'TXN101',
      time: '10:15:00',
      from_acc: 'VIC_10',
      to_acc: 'ACC_101',
      transfer_type: 'internal',
      sender_type: 'Savings',
      receiver_type: 'Savings',
      'amount (INR)': '2,50,000',
      txn_mode: 'IMPS',
      city: 'Delhi'
    }];

    const mapping = {
      'txn_id': 'transactionId',
      'time': 'timestamp',
      'from_acc': 'senderAccount',
      'to_acc': 'receiverAccount',
      'amount (INR)': 'amount',
      'txn_mode': 'transactionMode'
    };

    const result = normalizeData(data, mapping);
    
    expect(result.invalid).toBe(0);
    expect(result.valid).toBe(1);
    expect(result.normalizedData[0].transactionId).toBe('TXN101');
    expect(result.normalizedData[0].amount).toBe(250000);
    expect(result.normalizedData[0].senderAccount).toBe('VIC_10');
  });

  it('detects missing required columns', () => {
    const data = [{
      txn_id: 'TXN101',
      // missing from_acc
      to_acc: 'ACC_101',
      'amount (INR)': '2,50,000',
      txn_mode: 'IMPS',
      time: '10:15:00'
    }];

    const mapping = {
      'txn_id': 'transactionId',
      'time': 'timestamp',
      'from_acc': 'senderAccount',
      'to_acc': 'receiverAccount',
      'amount (INR)': 'amount',
      'txn_mode': 'transactionMode'
    };

    const result = normalizeData(data, mapping);
    
    expect(result.invalid).toBe(1);
    expect(result.valid).toBe(0);
    expect(result.errors[0].error).toBe('Missing Sender Account');
  });
});
