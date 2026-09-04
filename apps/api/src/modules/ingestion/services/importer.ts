import { PrismaClient } from '@prisma/client';
import { NormalizedTransaction } from './normalizer.js';

const prisma = new PrismaClient();

export async function importTransactions(
  bankId: string, 
  uploadId: string, 
  data: NormalizedTransaction[]
): Promise<number> {
  let count = 0;
  
  // To preserve integrity and handle relationships properly:
  // 1. Upsert all unique accounts
  // 2. Insert transactions
  
  const uniqueAccounts = new Set<string>();
  data.forEach(t => {
    if (t.senderAccount) uniqueAccounts.add(t.senderAccount);
    if (t.receiverAccount) uniqueAccounts.add(t.receiverAccount);
  });
  
  // Upsert accounts in chunks to avoid blocking/limits
  const accountArray = Array.from(uniqueAccounts);
  for (const accountRef of accountArray) {
    await prisma.account.upsert({
      where: { accountRef },
      update: { bankId },
      create: {
        accountRef,
        bankId,
        riskScore: 0,
        riskStatus: "unscored",
        watchlistStatus: "none"
      }
    });
  }

  // Get the IDs of the accounts to link correctly
  const accounts = await prisma.account.findMany({
    where: { accountRef: { in: accountArray } }
  });
  
  const accountMap = new Map(accounts.map(a => [a.accountRef, a.id]));

  // Batch insert transactions
  const transactionsToInsert = data.map(t => {
    return {
      sourceTransactionId: t.transactionId,
      bankId,
      uploadId,
      timestamp: t.timestamp!,
      senderAccountId: accountMap.get(t.senderAccount)!,
      receiverAccountId: accountMap.get(t.receiverAccount)!,
      transferType: t.transferType,
      senderAccountType: t.senderAccountType,
      receiverAccountType: t.receiverAccountType,
      amount: t.amount,
      transactionMode: t.transactionMode,
      locationCity: t.city,
      rawPayload: t.sourceRow
    };
  });

  // Prisma doesn't have createMany ignore duplicates natively in SQLite, 
  // so we insert one by one or filter out duplicates first.
  
  const existingTxns = await prisma.transaction.findMany({
    where: {
      bankId,
      sourceTransactionId: { in: transactionsToInsert.map(t => t.sourceTransactionId) }
    },
    select: { sourceTransactionId: true }
  });
  
  const existingIds = new Set(existingTxns.map(t => t.sourceTransactionId));
  
  const newTxns = transactionsToInsert.filter(t => !existingIds.has(t.sourceTransactionId));

  if (newTxns.length > 0) {
    await prisma.transaction.createMany({
      data: newTxns
    });
    
    // Find the db IDs of the newly inserted transactions for watchlist checking
    const insertedTxns = await prisma.transaction.findMany({
      where: {
        bankId,
        sourceTransactionId: { in: newTxns.map(t => t.sourceTransactionId) }
      }
    });

    // Import these dynamically to avoid circular dependencies if any
    const { checkWatchlistActivity } = await import('../../watchlist/service.js');
    const { analyzeAccountRisk } = await import('../../risk/scorer.js');

    const accountsToReanalyze = new Set<string>();

    for (const txn of insertedTxns) {
      await checkWatchlistActivity(txn.id);
      accountsToReanalyze.add(txn.senderAccountId);
      accountsToReanalyze.add(txn.receiverAccountId);
    }

    // Fire off risk analysis in background for affected accounts
    for (const accountId of Array.from(accountsToReanalyze)) {
      analyzeAccountRisk(accountId).catch(e => console.error("Risk analysis failed", e));
    }
  }

  // Update upload status
  await prisma.dataUpload.update({
    where: { id: uploadId },
    data: {
      status: "Imported",
      ingestedCount: newTxns.length
    }
  });

  return newTxns.length;
}
