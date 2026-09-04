import { prisma } from "../../lib/prisma.js";
import { createAlert } from "../alerts/service.js";

// Watchlist states: MONITORED, UNDER_REVIEW, ESCALATED, CLEARED

export async function addToWatchlist(accountId: string, reason: string, status: string = "MONITORED") {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Account not found");

  const entry = await prisma.watchlistAccount.upsert({
    where: { accountId },
    update: { reason, status },
    create: { accountId, reason, status }
  });

  await prisma.account.update({
    where: { id: accountId },
    data: { watchlistStatus: status.toLowerCase() }
  });

  return entry;
}

export async function updateWatchlistStatus(accountId: string, status: string) {
  const validStatuses = ["MONITORED", "UNDER_REVIEW", "ESCALATED", "CLEARED"];
  if (!validStatuses.includes(status)) throw new Error("Invalid status");

  const entry = await prisma.watchlistAccount.update({
    where: { accountId },
    data: { status }
  });

  await prisma.account.update({
    where: { id: accountId },
    data: { watchlistStatus: status.toLowerCase() }
  });

  return entry;
}

export async function removeFromWatchlist(accountId: string) {
  await prisma.watchlistAccount.delete({
    where: { accountId }
  });

  await prisma.account.update({
    where: { id: accountId },
    data: { watchlistStatus: "none" }
  });
}

export async function checkWatchlistActivity(transactionId: string) {
  // Check if a new transaction involves a watched account
  const txn = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      senderAccount: { include: { watchlist: true } },
      receiverAccount: { include: { watchlist: true } },
    }
  });
  if (!txn) return;

  const accountsToCheck = [txn.senderAccount, txn.receiverAccount];

  for (const acc of accountsToCheck) {
    if (acc.watchlist && acc.watchlist.status !== "CLEARED") {
      const formattedAmount = Number(txn.amount).toLocaleString("en-IN");
      
      let direction = "";
      let counterparty = "";
      if (acc.id === txn.senderAccountId) {
        direction = "sent";
        counterparty = txn.receiverAccount.accountRef;
      } else {
        direction = "received";
        counterparty = txn.senderAccount.accountRef;
      }

      await createAlert({
        accountId: acc.id,
        type: "WATCHLIST_ACTIVITY",
        severity: acc.riskStatus === "critical" ? "CRITICAL" : "HIGH",
        title: "Watchlist Account Activity",
        message: `Watched account ${acc.accountRef} ${direction} ₹${formattedAmount} ${direction === "sent" ? "to" : "from"} ${counterparty}. Mode: ${txn.transactionMode || 'Unknown'}.`
      });
    }
  }
}
