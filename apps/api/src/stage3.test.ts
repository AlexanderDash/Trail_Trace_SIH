import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createComplaint, findCandidates, confirmMatch, MATCH_CONFIG } from "./modules/complaints/service.js";
import { createTrail, getTrail, TRAIL_CONFIG } from "./modules/trails/service.js";
import { parseAmount, parseTimestamp } from "./modules/ingestion/services/normalizer.js";

const prisma = new PrismaClient();

// ── Fixture data ────────────────────────────────────────────────────
// Based on the exact synthetic scenario from the prompt.

const SBI_FIXTURE = [
  { txnId: "TXN101", time: "10:15:00", from: "VIC_10", to: "ACC_101", type: "internal", sType: "Savings", rType: "Savings", amount: 250000, mode: "IMPS", city: "Delhi" },
  { txnId: "TXN102", time: "10:22:00", from: "ACC_101", to: "ACC_201", type: "external", sType: "Savings", rType: "Current", amount: 120000, mode: "UPI", city: "Noida" },
  { txnId: "TXN103", time: "10:25:00", from: "ACC_101", to: "ACC_202", type: "external", sType: "Savings", rType: "Savings", amount: 125000, mode: "NEFT", city: "Ghaziabad" },
  { txnId: "TXN104", time: "10:38:00", from: "ACC_201", to: "ACC_301", type: "internal", sType: "Current", rType: "Savings", amount: 118000, mode: "IMPS", city: "Jamtara" },
  { txnId: "TXN105", time: "10:45:00", from: "ACC_301", to: "ACC_401", type: "external", sType: "Savings", rType: "Savings", amount: 95000, mode: "UPI", city: "Deoghar" },
  // Unrelated noise transactions
  { txnId: "TXN106", time: "09:00:00", from: "ACC_X01", to: "ACC_X02", type: "internal", sType: "Current", rType: "Current", amount: 5000, mode: "UPI", city: "Mumbai" },
  { txnId: "TXN107", time: "14:00:00", from: "ACC_X03", to: "ACC_X04", type: "internal", sType: "Savings", rType: "Savings", amount: 15000, mode: "NEFT", city: "Pune" },
];

const BOB_FIXTURE = [
  { txnId: "TXN201", time: "10:52:00", from: "ACC_401", to: "ACC_501", type: "external", sType: "Savings", rType: "Savings", amount: 90000, mode: "NEFT", city: "Deoghar" },
  { txnId: "TXN202", time: "11:03:00", from: "ACC_501", to: "ACC_511", type: "internal", sType: "Savings", rType: "Current", amount: 82000, mode: "IMPS", city: "Jamtara" },
  { txnId: "TXN203", time: "11:16:00", from: "ACC_511", to: "ACC_601", type: "external", sType: "Current", rType: "Savings", amount: 78000, mode: "NEFT", city: "Dhanbad" },
];

const ICICI_FIXTURE = [
  { txnId: "TXN301", time: "11:30:00", from: "ACC_601", to: "ACC_801", type: "internal", sType: "Savings", rType: "Savings", amount: 70000, mode: "UPI", city: "Ranchi" },
];

let sbiBank: any, bobBank: any, iciciBank: any;
let sbiUpload: any, bobUpload: any, iciciUpload: any;

async function seedFixtures() {
  // Clean slate (keep banks)
  await prisma.trailConnection.deleteMany();
  await prisma.trailNode.deleteMany();
  await prisma.trail.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.dataUpload.deleteMany();
  await prisma.watchlistAccount.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.riskHistory.deleteMany();
  await prisma.riskSignal.deleteMany();
  await prisma.riskProfile.deleteMany();
  await prisma.account.deleteMany();

  // Banks should already exist from seed, but upsert just in case
  sbiBank = await prisma.bank.upsert({ where: { code: "SBI" }, update: {}, create: { code: "SBI", name: "State Bank of India" } });
  bobBank = await prisma.bank.upsert({ where: { code: "BOB" }, update: {}, create: { code: "BOB", name: "Bank of Baroda" } });
  iciciBank = await prisma.bank.upsert({ where: { code: "ICICI" }, update: {}, create: { code: "ICICI", name: "ICICI Bank" } });

  // DataUploads
  sbiUpload = await prisma.dataUpload.create({ data: { bankId: sbiBank.id, fileName: "SBI_test.csv", originalFormat: "csv", status: "Imported", rowCount: SBI_FIXTURE.length, ingestedCount: SBI_FIXTURE.length } });
  bobUpload = await prisma.dataUpload.create({ data: { bankId: bobBank.id, fileName: "BOB_test.csv", originalFormat: "csv", status: "Imported", rowCount: BOB_FIXTURE.length, ingestedCount: BOB_FIXTURE.length } });
  iciciUpload = await prisma.dataUpload.create({ data: { bankId: iciciBank.id, fileName: "ICICI_test.csv", originalFormat: "csv", status: "Imported", rowCount: ICICI_FIXTURE.length, ingestedCount: ICICI_FIXTURE.length } });

  // Collect all unique accounts
  const allAccounts = new Set<string>();
  for (const fixtures of [SBI_FIXTURE, BOB_FIXTURE, ICICI_FIXTURE]) {
    for (const row of fixtures) {
      allAccounts.add(row.from);
      allAccounts.add(row.to);
    }
  }

  // Create accounts
  for (const ref of allAccounts) {
    await prisma.account.upsert({
      where: { accountRef: ref },
      update: {},
      create: { accountRef: ref, riskScore: 0, riskStatus: "unscored", watchlistStatus: "none" },
    });
  }

  const accountMap = new Map<string, string>();
  const accounts = await prisma.account.findMany();
  for (const acc of accounts) accountMap.set(acc.accountRef, acc.id);

  // Insert transactions
  async function insertTxns(fixtures: typeof SBI_FIXTURE, bankId: string, uploadId: string) {
    for (const row of fixtures) {
      await prisma.transaction.create({
        data: {
          sourceTransactionId: row.txnId,
          bankId,
          uploadId,
          timestamp: new Date(`1970-01-01T${row.time}Z`),
          senderAccountId: accountMap.get(row.from)!,
          receiverAccountId: accountMap.get(row.to)!,
          transferType: row.type,
          senderAccountType: row.sType,
          receiverAccountType: row.rType,
          amount: row.amount,
          transactionMode: row.mode,
          locationCity: row.city,
          rawPayload: row,
        },
      });
    }
  }

  await insertTxns(SBI_FIXTURE, sbiBank.id, sbiUpload.id);
  await insertTxns(BOB_FIXTURE, bobBank.id, bobUpload.id);
  await insertTxns(ICICI_FIXTURE, iciciBank.id, iciciUpload.id);
}

// ── Tests ───────────────────────────────────────────────────────────

describe("Stage 3 — Complaint Matching + Trail Engine", () => {
  beforeAll(async () => {
    await seedFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── Complaint creation ────────────────────────────────────────
  describe("Complaint creation", () => {
    it("creates a complaint and stores it", async () => {
      const c = await createComplaint({
        complaintRef: "CMP_TEST_001",
        victimAccountRef: "VIC_10",
        amount: "2,50,000",
        timestamp: "10:15:00",
        transactionMode: "IMPS",
        description: "Unauthorized transfer of ₹2,50,000.",
      });
      expect(c.complaintRef).toBe("CMP_TEST_001");
      expect(Number(c.amount)).toBe(250000);
      expect(c.investigationStatus).toBe("NEW");
    });
  });

  // ── Candidate matching ────────────────────────────────────────
  describe("Candidate matching", () => {
    let complaintId: string;

    beforeAll(async () => {
      const c = await prisma.complaint.findFirst({ where: { complaintRef: "CMP_TEST_001" } });
      complaintId = c!.id;
    });

    it("finds TXN101 as the strongest candidate", async () => {
      const candidates = await findCandidates(complaintId);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].sourceTransactionId).toBe("TXN101");
      expect(candidates[0].confidence).toBeGreaterThanOrEqual(90);
    });

    it("scores exact account match", async () => {
      const candidates = await findCandidates(complaintId);
      const top = candidates[0];
      expect(top.reasons).toContain("✓ Victim account matched");
    });

    it("scores exact amount match", async () => {
      const candidates = await findCandidates(complaintId);
      const top = candidates[0];
      expect(top.reasons.some((r: string) => r.includes("Amount matched exactly"))).toBe(true);
    });

    it("scores transaction mode match", async () => {
      const candidates = await findCandidates(complaintId);
      const top = candidates[0];
      expect(top.reasons.some((r: string) => r.includes("mode matched"))).toBe(true);
    });

    it("scores time proximity", async () => {
      const candidates = await findCandidates(complaintId);
      const top = candidates[0];
      expect(top.reasons.some((r: string) => r.includes("time matched") || r.includes("within"))).toBe(true);
    });

    it("ranks candidates by confidence descending", async () => {
      const candidates = await findCandidates(complaintId);
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].confidence).toBeGreaterThanOrEqual(candidates[i].confidence);
      }
    });

    it("preserves source bank identity", async () => {
      const candidates = await findCandidates(complaintId);
      expect(candidates[0].bankName).toBe("State Bank of India");
    });
  });

  // ── No match scenario ─────────────────────────────────────────
  describe("No-match complaint", () => {
    it("returns empty candidates for a non-existent victim account", async () => {
      const c = await createComplaint({
        complaintRef: "CMP_NOMATCH",
        victimAccountRef: "NONEXISTENT_999",
        amount: "100000",
        timestamp: "10:15:00",
        transactionMode: "UPI",
      });
      const candidates = await findCandidates(c.id);
      expect(candidates.length).toBe(0);
    });
  });

  // ── Trail construction ────────────────────────────────────────
  describe("Trail engine", () => {
    let trailResult: any;

    beforeAll(async () => {
      // Confirm match for CMP_TEST_001
      const complaint = await prisma.complaint.findFirst({ where: { complaintRef: "CMP_TEST_001" } });
      const candidates = await findCandidates(complaint!.id);
      await confirmMatch(complaint!.id, candidates[0].transactionId, candidates[0].confidence);

      // Create trail
      trailResult = await createTrail(complaint!.id);
    });

    it("creates a trail from matched complaint", () => {
      expect(trailResult.trailId).toBeDefined();
      expect(trailResult.complaintId).toBeDefined();
      expect(trailResult.status).toBe("ACTIVE");
    });

    it("starts with the victim account", () => {
      expect(trailResult.nodes[0].accountRef).toBe("VIC_10");
      expect(trailResult.nodes[0].role).toBe("victim");
    });

    it("traces forward through SBI transactions", () => {
      const refs = trailResult.nodes.map((n: any) => n.accountRef);
      expect(refs).toContain("ACC_101");
      expect(refs).toContain("ACC_201");
    });

    it("handles multiple outgoing transactions (split)", () => {
      // ACC_101 sends to both ACC_201 and ACC_202
      const refs = trailResult.nodes.map((n: any) => n.accountRef);
      expect(refs).toContain("ACC_201");
      expect(refs).toContain("ACC_202");
    });

    it("performs cross-bank traversal (SBI → BOB)", () => {
      const refs = trailResult.nodes.map((n: any) => n.accountRef);
      expect(refs).toContain("ACC_501"); // BOB
      expect(refs).toContain("ACC_511"); // BOB
    });

    it("performs cross-bank traversal (BOB → ICICI)", () => {
      const refs = trailResult.nodes.map((n: any) => n.accountRef);
      expect(refs).toContain("ACC_601"); // ICICI boundary
    });

    it("traces into ICICI bank", () => {
      const refs = trailResult.nodes.map((n: any) => n.accountRef);
      expect(refs).toContain("ACC_801"); // ICICI continuation
    });

    it("identifies the last known account", () => {
      // The last account should be the terminal node in the deepest path
      expect(trailResult.lastKnownAccount).toBeDefined();
      expect(typeof trailResult.lastKnownAccount).toBe("string");
    });

    it("identifies correct banks crossed", () => {
      expect(trailResult.banksCrossed).toContain("SBI");
      expect(trailResult.banksCrossed).toContain("BOB");
    });

    it("does NOT include unrelated noise transactions", () => {
      const refs = trailResult.nodes.map((n: any) => n.accountRef);
      expect(refs).not.toContain("ACC_X01");
      expect(refs).not.toContain("ACC_X02");
      expect(refs).not.toContain("ACC_X03");
      expect(refs).not.toContain("ACC_X04");
    });

    it("generates a human-readable summary", () => {
      expect(trailResult.summary).toContain("CMP_TEST_001");
      expect(trailResult.summary).toContain("TXN101");
      expect(trailResult.summary).toContain("VIC_10");
    });

    it("persists trail and can be retrieved", async () => {
      const retrieved = await getTrail(trailResult.trailId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.nodes.length).toBeGreaterThan(0);
      expect(retrieved!.nodes[0].accountRef).toBe("VIC_10");
    });

    it("preserves source bank at each node", () => {
      for (const node of trailResult.nodes) {
        expect(node.bankCode).toBeDefined();
        expect(["SBI", "BOB", "ICICI", "UNK"]).toContain(node.bankCode);
      }
    });
  });

  // ── Amount parsing ────────────────────────────────────────────
  describe("Amount normalization", () => {
    it("parses Indian-format amounts", () => {
      expect(parseAmount("2,50,000")).toBe(250000);
      expect(parseAmount("1,20,000")).toBe(120000);
      expect(parseAmount("95,000")).toBe(95000);
    });
    it("parses plain integers", () => {
      expect(parseAmount("480000")).toBe(480000);
    });
    it("parses decimals", () => {
      expect(parseAmount("450000.50")).toBe(450000.50);
    });
    it("rejects invalid amounts", () => {
      expect(parseAmount("abc")).toBeNull();
    });
  });

  // ── Timestamp parsing ─────────────────────────────────────────
  describe("Timestamp normalization", () => {
    it("parses HH:mm:ss", () => {
      const d = parseTimestamp("10:15:00");
      expect(d).not.toBeNull();
      expect(d!.getUTCHours()).toBe(10);
      expect(d!.getUTCMinutes()).toBe(15);
    });

    it("parses HH:mm", () => {
      const d = parseTimestamp("10:15");
      expect(d).not.toBeNull();
    });
  });

  // ── Cycle detection ───────────────────────────────────────────
  describe("Cycle detection", () => {
    it("does not revisit already-visited accounts (BFS visited set)", async () => {
      // Verify that no trail has duplicate accounts in its nodes
      const trails = await prisma.trail.findMany({
        include: {
          nodes: {
            include: { account: true },
            orderBy: { sequence: "asc" },
          },
        },
      });
      for (const trail of trails) {
        const refs = trail.nodes.map((n: any) => n.account.accountRef);
        const unique = new Set(refs);
        expect(refs.length).toBe(unique.size);
      }
    });
  });

  // ── Source row preservation ───────────────────────────────────
  describe("Source data preservation", () => {
    it("transactions retain rawPayload from source row", async () => {
      const txn = await prisma.transaction.findFirst({
        where: { sourceTransactionId: "TXN101" },
      });
      expect(txn).not.toBeNull();
      expect(txn!.rawPayload).not.toBeNull();
      const payload = txn!.rawPayload as any;
      expect(payload.txnId).toBe("TXN101");
    });

    it("transactions retain their source upload reference", async () => {
      const txn = await prisma.transaction.findFirst({
        where: { sourceTransactionId: "TXN101" },
      });
      expect(txn!.uploadId).toBe(sbiUpload.id);
    });

    it("transactions retain their source bank", async () => {
      const txn = await prisma.transaction.findFirst({
        where: { sourceTransactionId: "TXN201" },
        include: { bank: true },
      });
      expect(txn!.bank.code).toBe("BOB");
    });
  });
});

