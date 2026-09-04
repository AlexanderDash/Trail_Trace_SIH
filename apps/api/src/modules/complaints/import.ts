import * as xlsx from "xlsx";
import { prisma } from "../../lib/prisma.js";
import { parseAmount, parseTimestamp } from "../ingestion/services/normalizer.js";
import { findCandidates, confirmMatch } from "./service.js";
import { createTrail } from "../trails/service.js";

export async function processComplaintUpload(uploadId: string, filePath: string) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: any[] = xlsx.utils.sheet_to_json(sheet, { raw: false });

  if (!rawData || rawData.length === 0) {
    await prisma.complaintUpload.update({
      where: { id: uploadId },
      data: { status: "FAILED" },
    });
    return;
  }

  let importedCount = 0;

  for (const row of rawData) {
    try {
      // Find columns heuristically
      const keys = Object.keys(row);
      const getVal = (possibleNames: string[]) => {
        for (const k of keys) {
          const lk = k.toLowerCase().replace(/[^a-z0-9]/g, "");
          for (const name of possibleNames) {
             if (lk.includes(name)) return row[k];
          }
        }
        return null;
      };

      const complaintRef = getVal(["complaintid", "id", "ref"]) || `IMP_${Date.now()}_${importedCount}`;
      const victimAccountRef = getVal(["victim", "account", "acc"]);
      const amountStr = getVal(["amount", "lost", "value"]);
      const timeStr = getVal(["time", "date"]);
      const mode = getVal(["mode", "type"]);
      const city = getVal(["city", "location"]);
      const description = getVal(["desc", "complaint"]);
      const suspectedTxnId = getVal(["txn", "suspected", "transaction"]);

      if (!victimAccountRef || !amountStr || !timeStr) continue;

      const parsedAmount = parseAmount(String(amountStr));
      const parsedTime = parseTimestamp(String(timeStr));
      if (!parsedAmount || !parsedTime) continue;

      // Ensure victim account exists
      let victimAccount = await prisma.account.findUnique({
        where: { accountRef: String(victimAccountRef) },
      });
      if (!victimAccount) {
        victimAccount = await prisma.account.create({
          data: {
            accountRef: String(victimAccountRef),
            riskScore: 0,
            riskStatus: "unscored",
            watchlistStatus: "none",
          },
        });
      }

      const complaint = await prisma.complaint.upsert({
        where: { complaintRef: String(complaintRef) },
        update: {
          uploadId,
          victimAccountId: victimAccount.id,
          amount: parsedAmount,
          timestamp: parsedTime,
          transactionMode: mode ? String(mode) : null,
          city: city ? String(city) : null,
          description: description ? String(description) : null,
          suspectedTransactionId: suspectedTxnId ? String(suspectedTxnId) : null,
        },
        create: {
          uploadId,
          complaintRef: String(complaintRef),
          victimAccountId: victimAccount.id,
          amount: parsedAmount,
          timestamp: parsedTime,
          transactionMode: mode ? String(mode) : null,
          city: city ? String(city) : null,
          description: description ? String(description) : null,
          suspectedTransactionId: suspectedTxnId ? String(suspectedTxnId) : null,
          investigationStatus: "NEW"
        }
      });

      importedCount++;

      // Try automatic matching
      if (complaint.investigationStatus === "NEW") {
        try {
          const candidates = await findCandidates(complaint.id);
          
          let bestMatch = candidates[0];
          
          // Boost if suspectedTxnId matches exactly
          if (suspectedTxnId) {
             const exactMatch = candidates.find(c => c.sourceTransactionId === suspectedTxnId);
             if (exactMatch) bestMatch = exactMatch;
          }

          if (bestMatch && bestMatch.confidence >= 50) {
            await confirmMatch(complaint.id, bestMatch.transactionId, bestMatch.confidence);
            // Also create the trail automatically
            await createTrail(complaint.id);
          }
        } catch (matchErr) {
          console.error("Match error for complaint", complaint.id, matchErr);
        }
      }

    } catch (e) {
      console.error("Row import error", e);
    }
  }

  await prisma.complaintUpload.update({
    where: { id: uploadId },
    data: {
      status: "COMPLETED",
      rowCount: rawData.length,
      importedCount,
    },
  });
}
