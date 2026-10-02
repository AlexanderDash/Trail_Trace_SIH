import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";
import { parseAmount, parseTimestamp } from "../src/modules/ingestion/services/normalizer.js";
import { createTrail } from "../src/modules/trails/service.js";
import { analyzeAllAccounts } from "../src/modules/risk/scorer.js";

import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=== ANVESH Database Seeder ===");

  // 1. Seed Banks
  const banks = [
    { code: "SBI", name: "State Bank of India" },
    { code: "BOB", name: "Bank of Baroda" },
    { code: "ICICI", name: "ICICI Bank" },
    { code: "HDFC", name: "HDFC Bank" },
    { code: "AXIS", name: "Axis Bank" },
  ];

  const bankMap = new Map<string, string>();
  for (const bank of banks) {
    const b = await prisma.bank.upsert({
      where: { code: bank.code },
      update: { name: bank.name },
      create: bank,
    });
    bankMap.set(bank.code, b.id);
  }
  console.log("✓ Seeded bank registry:", banks.map((b) => b.code).join(", "));

  // Helper to resolve sample files from different working directories
  const resolveFile = (filename: string) => {
    const candidates = [
      path.resolve(process.cwd(), "sample_data", filename),
      path.resolve(process.cwd(), "../../sample_data", filename),
      path.resolve(__dirname, "../../../sample_data", filename),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  };

  const txnFilePath = resolveFile("bank_transactions.csv");
  const cmpFilePath = resolveFile("cybercrime_complaints.csv");

  if (!txnFilePath || !cmpFilePath) {
    console.warn("⚠ Sample CSV files not found. Skipping transaction seeding.");
    return;
  }

  // 2. Parse & Ingest Bank Transactions
  console.log(`Reading transactions from: ${txnFilePath}`);
  const txnCsv = fs.readFileSync(txnFilePath, "utf8");
  const { data: rawTxns } = Papa.parse(txnCsv, { header: true, skipEmptyLines: true }) as { data: any[] };

  // Collect unique accounts
  const accountRefs = new Set<string>();
  for (const row of rawTxns) {
    if (row.from_acc) accountRefs.add(row.from_acc.trim());
    if (row.to_acc) accountRefs.add(row.to_acc.trim());
  }

  // Assign bank based on account prefix or rotate
  const sbiId = bankMap.get("SBI")!;
  const bobId = bankMap.get("BOB")!;
  const iciciId = bankMap.get("ICICI")!;
  const hdfcId = bankMap.get("HDFC")!;

  const getBankIdForAcc = (acc: string) => {
    if (acc.includes("10")) return sbiId;
    if (acc.includes("20")) return bobId;
    if (acc.includes("50") || acc.includes("60")) return iciciId;
    return hdfcId;
  };

  for (const accRef of accountRefs) {
    await prisma.account.upsert({
      where: { accountRef: accRef },
      update: {},
      create: {
        accountRef: accRef,
        bankId: getBankIdForAcc(accRef),
        riskScore: 0,
        riskStatus: "unscored",
        watchlistStatus: "none",
      },
    });
  }

  const allAccounts = await prisma.account.findMany();
  const accMap = new Map(allAccounts.map((a) => [a.accountRef, a.id]));

  let insertedTxns = 0;
  for (const row of rawTxns) {
    if (!row.txn_id || !row.from_acc || !row.to_acc || !row.amount) continue;

    const amount = parseAmount(row.amount);
    const timestamp = parseTimestamp(row.timestamp);
    if (!amount || !timestamp) continue;

    const senderId = accMap.get(row.from_acc.trim());
    const receiverId = accMap.get(row.to_acc.trim());
    if (!senderId || !receiverId) continue;

    await prisma.transaction.upsert({
      where: {
        bankId_sourceTransactionId: {
          bankId: getBankIdForAcc(row.from_acc.trim()),
          sourceTransactionId: row.txn_id.trim(),
        },
      },
      update: {
        amount,
        timestamp,
        locationCity: row.city?.trim() || null,
        transactionMode: row.txn_mode?.trim() || null,
      },
      create: {
        sourceTransactionId: row.txn_id.trim(),
        bankId: getBankIdForAcc(row.from_acc.trim()),
        senderAccountId: senderId,
        receiverAccountId: receiverId,
        amount,
        timestamp,
        transferType: row.transfer_type || "external",
        senderAccountType: row.sender_type || "Savings",
        receiverAccountType: row.receiver_type || "Current",
        transactionMode: row.txn_mode?.trim() || "UPI",
        locationCity: row.city?.trim() || null,
      },
    });
    insertedTxns++;
  }
  console.log(`✓ Upserted ${accountRefs.size} accounts and ${insertedTxns} transactions.`);

  // 3. Parse & Ingest Cybercrime Complaints
  console.log(`Reading complaints from: ${cmpFilePath}`);
  const cmpCsv = fs.readFileSync(cmpFilePath, "utf8");
  const { data: rawCmps } = Papa.parse(cmpCsv, { header: true, skipEmptyLines: true }) as { data: any[] };

  let matchedCount = 0;
  for (const row of rawCmps) {
    if (!row.complaint_id || !row.victim_account_no || !row.amount_lost_inr) continue;

    const amount = parseAmount(row.amount_lost_inr);
    const timestamp = parseTimestamp(row.complaint_date);
    if (!amount || !timestamp) continue;

    // Ensure victim account exists
    let victimAcc = await prisma.account.findUnique({
      where: { accountRef: row.victim_account_no.trim() },
    });
    if (!victimAcc) {
      victimAcc = await prisma.account.create({
        data: {
          accountRef: row.victim_account_no.trim(),
          bankId: sbiId,
          riskScore: 0,
          riskStatus: "unscored",
          watchlistStatus: "none",
        },
      });
    }

    // Find suspected transaction if specified
    const suspectedTxnId = row.suspected_transaction_id?.trim();
    let matchedTxnId: string | null = null;

    if (suspectedTxnId) {
      const found = await prisma.transaction.findFirst({
        where: { sourceTransactionId: suspectedTxnId },
      });
      if (found) matchedTxnId = found.id;
    }

    const complaint = await prisma.complaint.upsert({
      where: { complaintRef: row.complaint_id.trim() },
      update: {
        victimAccountId: victimAcc.id,
        amount,
        timestamp,
        transactionMode: row.txn_mode?.trim() || null,
        city: row.city?.trim() || null,
        description: row.complaint?.trim() || null,
        suspectedTransactionId: suspectedTxnId || null,
        matchedTransactionId: matchedTxnId,
        investigationStatus: matchedTxnId ? "MATCHED" : "NEW",
      },
      create: {
        complaintRef: row.complaint_id.trim(),
        victimAccountId: victimAcc.id,
        amount,
        timestamp,
        transactionMode: row.txn_mode?.trim() || "UPI",
        city: row.city?.trim() || null,
        description: row.complaint?.trim() || null,
        suspectedTransactionId: suspectedTxnId || null,
        matchedTransactionId: matchedTxnId,
        investigationStatus: matchedTxnId ? "MATCHED" : "NEW",
      },
    });

    if (matchedTxnId) {
      matchedCount++;
      // Create money trail if not already created
      const existingTrail = await prisma.trail.findFirst({
        where: { complaintId: complaint.id },
      });
      if (!existingTrail) {
        try {
          await createTrail(complaint.id);
        } catch (e: any) {
          console.warn(`Could not create trail for ${complaint.complaintRef}:`, e?.message);
        }
      }
    }
  }
  console.log(`✓ Upserted ${rawCmps.length} complaints (${matchedCount} auto-matched into money trails).`);

  // 4. Run Risk Engine across all accounts
  console.log("Running ANVESH multi-hop behavioural risk scoring...");
  const scored = await analyzeAllAccounts();
  console.log(`✓ Scored ${scored.length} accounts. Active risk alerts generated.`);

  // 5. Create Sample Investigation Case Dossiers for Demo
  const matchedComplaints = await prisma.complaint.findMany({
    where: { matchedTransactionId: { not: null } },
    take: 2,
  });

  for (let i = 0; i < matchedComplaints.length; i++) {
    const cmp = matchedComplaints[i];
    const caseNum = `CASE-2026-${String(i + 1).padStart(3, "0")}`;
    const inv = await prisma.investigation.upsert({
      where: { caseNumber: caseNum },
      update: {},
      create: {
        caseNumber: caseNum,
        title: `Interdiction Operation: ${cmp.complaintRef} (${cmp.city || "Multi-jurisdiction"})`,
        description: cmp.description || "Active cybercrime interdiction investigation.",
        priority: "CRITICAL",
        status: "ACTIVE",
        notes: "ANVESH Priority Choke-Point freeze advisory active.",
      },
    });

    // Link complaint to investigation
    await prisma.complaint.update({
      where: { id: cmp.id },
      data: { investigationId: inv.id },
    });

    // Link trail to investigation
    const trail = await prisma.trail.findFirst({ where: { complaintId: cmp.id } });
    if (trail) {
      await prisma.trail.update({
        where: { id: trail.id },
        data: { investigationId: inv.id },
      });
    }

    // Add 4-tier findings
    const findingsCount = await prisma.investigationFinding.count({
      where: { investigationId: inv.id },
    });
    if (findingsCount === 0) {
      await prisma.investigationFinding.createMany({
        data: [
          {
            investigationId: inv.id,
            type: "[Observed]",
            description: `Unauthorized transfer of ₹${Number(cmp.amount).toLocaleString()} initiated from victim account.`,
            author: "System / Evidence Pipeline",
          },
          {
            investigationId: inv.id,
            type: "[Linked]",
            description: `Funds split across 3 second-hop accounts in Jamtara hub within 4 minutes.`,
            author: "Graph BFS Engine",
          },
          {
            investigationId: inv.id,
            type: "[Inferred]",
            description: `Rapid forwarding velocity (>90% balance swept within 180s) matches syndicate cash-out pattern.`,
            author: "Behavioural Risk Scorer",
          },
          {
            investigationId: inv.id,
            type: "Choke-Point Freeze Advisory",
            description: `Immediate Section 91 CrPC account freeze advisory issued on primary concentrator account.`,
            author: "Interdiction Optimizer",
          },
        ],
      });
    }
  }
  console.log("✓ Pre-populated active ANVESH investigation dossiers with 4-tier evidence breakdown.");
  console.log("=== ANVESH Database Seeding Complete ===");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
