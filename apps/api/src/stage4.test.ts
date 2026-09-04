import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { extractFeatures } from "./modules/risk/features.js";
import { analyzeAccountRisk } from "./modules/risk/scorer.js";
import { addToWatchlist, checkWatchlistActivity } from "./modules/watchlist/service.js";
import { createAlert } from "./modules/alerts/service.js";

const prisma = new PrismaClient();

// Data arrays
const LEGIT_BUSINESS_FIXTURE = [
  // High volume, but no rapid forwarding or fan-out
  ...Array.from({length: 50}).map((_, i) => ({
    txnId: `LEGIT_IN_${i}`, time: "10:00:00", from: `CUST_${i}`, to: "PETROL_01", type: "external", amount: 2000, mode: "UPI"
  })),
  ...Array.from({length: 5}).map((_, i) => ({
    txnId: `LEGIT_OUT_${i}`, time: "18:00:00", from: "PETROL_01", to: `SUPPLIER_${i}`, type: "external", amount: 15000, mode: "NEFT"
  }))
];

let bank: any;

async function seedStage4Data() {
  bank = await prisma.bank.upsert({ where: { code: "SBI" }, update: {}, create: { code: "SBI", name: "State Bank of India" } });

  // 1. Create Petrol Pump account and its customers
  await prisma.account.upsert({ where: { accountRef: "PETROL_01" }, update: {}, create: { accountRef: "PETROL_01", accountType: "Current" } });
  
  for (const row of LEGIT_BUSINESS_FIXTURE) {
    await prisma.account.upsert({ where: { accountRef: row.from }, update: {}, create: { accountRef: row.from } });
    await prisma.account.upsert({ where: { accountRef: row.to }, update: {}, create: { accountRef: row.to } });
  }

  const accountMap = new Map<string, string>();
  const accounts = await prisma.account.findMany();
  for (const acc of accounts) accountMap.set(acc.accountRef, acc.id);

  // Insert Legit Business Txns
  for (const row of LEGIT_BUSINESS_FIXTURE) {
    await prisma.transaction.create({
      data: {
        sourceTransactionId: row.txnId,
        bankId: bank.id,
        timestamp: new Date(`1970-01-01T${row.time}Z`),
        senderAccountId: accountMap.get(row.from)!,
        receiverAccountId: accountMap.get(row.to)!,
        amount: row.amount,
        transactionMode: row.mode,
      }
    });
  }

  // Ensure Stage 3 accounts exist (ACC_401)
  const acc401 = await prisma.account.upsert({ where: { accountRef: "ACC_401" }, update: {}, create: { accountRef: "ACC_401" } });
  
  // Create 3 distinct complaints pointing to ACC_401
  const complaint1 = await prisma.complaint.create({ data: { complaintRef: "CMP_S4_1", victimAccountId: acc401.id, amount: 1000, timestamp: new Date() } });
  const complaint2 = await prisma.complaint.create({ data: { complaintRef: "CMP_S4_2", victimAccountId: acc401.id, amount: 1000, timestamp: new Date() } });
  const complaint3 = await prisma.complaint.create({ data: { complaintRef: "CMP_S4_3", victimAccountId: acc401.id, amount: 1000, timestamp: new Date() } });

  const trail1 = await prisma.trail.create({ data: { complaintId: complaint1.id } });
  const trail2 = await prisma.trail.create({ data: { complaintId: complaint2.id } });
  const trail3 = await prisma.trail.create({ data: { complaintId: complaint3.id } });

  await prisma.trailNode.create({ data: { trailId: trail1.id, accountId: acc401.id, sequence: 1, role: 'intermediate' }});
  await prisma.trailNode.create({ data: { trailId: trail2.id, accountId: acc401.id, sequence: 1, role: 'intermediate' }});
  await prisma.trailNode.create({ data: { trailId: trail3.id, accountId: acc401.id, sequence: 1, role: 'intermediate' }});

  // Create Rapid Forwarding for ACC_401
  const acc401Id = acc401.id;
  const victim = await prisma.account.upsert({ where: { accountRef: "VIC_99" }, update: {}, create: { accountRef: "VIC_99" } });
  const dest1 = await prisma.account.upsert({ where: { accountRef: "DEST_1" }, update: {}, create: { accountRef: "DEST_1" } });
  const dest2 = await prisma.account.upsert({ where: { accountRef: "DEST_2" }, update: {}, create: { accountRef: "DEST_2" } });
  const dest3 = await prisma.account.upsert({ where: { accountRef: "DEST_3" }, update: {}, create: { accountRef: "DEST_3" } });
  const dest4 = await prisma.account.upsert({ where: { accountRef: "DEST_4" }, update: {}, create: { accountRef: "DEST_4" } });
  const dest5 = await prisma.account.upsert({ where: { accountRef: "DEST_5" }, update: {}, create: { accountRef: "DEST_5" } });
  
  // Received 100000
  await prisma.transaction.create({
    data: { sourceTransactionId: "TXN_IN_401", bankId: bank.id, timestamp: new Date("1970-01-01T10:00:00Z"), senderAccountId: victim.id, receiverAccountId: acc401Id, amount: 100000 }
  });

  // Forwarded within 5 mins to 5 distinct accounts (Fan-out)
  await prisma.transaction.create({ data: { sourceTransactionId: "TXN_OUT_401_1", bankId: bank.id, timestamp: new Date("1970-01-01T10:03:00Z"), senderAccountId: acc401Id, receiverAccountId: dest1.id, amount: 20000 }});
  await prisma.transaction.create({ data: { sourceTransactionId: "TXN_OUT_401_2", bankId: bank.id, timestamp: new Date("1970-01-01T10:04:00Z"), senderAccountId: acc401Id, receiverAccountId: dest2.id, amount: 20000 }});
  await prisma.transaction.create({ data: { sourceTransactionId: "TXN_OUT_401_3", bankId: bank.id, timestamp: new Date("1970-01-01T10:05:00Z"), senderAccountId: acc401Id, receiverAccountId: dest3.id, amount: 20000 }});
  await prisma.transaction.create({ data: { sourceTransactionId: "TXN_OUT_401_4", bankId: bank.id, timestamp: new Date("1970-01-01T10:06:00Z"), senderAccountId: acc401Id, receiverAccountId: dest4.id, amount: 20000 }});
  await prisma.transaction.create({ data: { sourceTransactionId: "TXN_OUT_401_5", bankId: bank.id, timestamp: new Date("1970-01-01T10:07:00Z"), senderAccountId: acc401Id, receiverAccountId: dest5.id, amount: 15000 }}); // 95% total
}

describe("Stage 4 - Behavioural Risk Engine", () => {
  beforeAll(async () => {
    // Clear previously populated Stage 4 test data to avoid unique constraint errors if re-run
    await prisma.trailConnection.deleteMany();
    await prisma.trailNode.deleteMany();
    await prisma.trail.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.watchlistAccount.deleteMany();
    await prisma.alert.deleteMany();
    await prisma.riskHistory.deleteMany();
    await prisma.riskSignal.deleteMany();
    await prisma.riskProfile.deleteMany();
    await prisma.account.deleteMany();
    await prisma.dataUpload.deleteMany();
    await seedStage4Data();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Feature Extraction - Legitimate Business", () => {
    it("extracts high volume but low risk signals for PETROL_01", async () => {
      const account = await prisma.account.findUnique({ where: { accountRef: "PETROL_01" } });
      const features = await extractFeatures(account!.id);
      
      expect(features.incomingCount).toBe(50);
      expect(features.outgoingCount).toBe(5);
      expect(features.distinctCounterparties).toBe(55);
      
      // Should not have rapid forwarding because all IN were at 10:00, OUT at 18:00 (8 hrs later, > 15 mins)
      expect(features.rapidForwardingCount).toBe(0);
      expect(features.averageForwardingRatio).toBe(0);
      
      // Should have zero complaint trails
      expect(features.distinctComplaintTrailCount).toBe(0);
    });

    it("assigns LOW risk score to high-volume legitimate business", async () => {
      const account = await prisma.account.findUnique({ where: { accountRef: "PETROL_01" } });
      const risk = await analyzeAccountRisk(account!.id);
      
      expect(risk.level).toBe("LOW");
      expect(risk.score).toBeLessThan(25);
    });
  });

  describe("Feature Extraction - Mule Account", () => {
    let accId: string;

    beforeAll(async () => {
      const account = await prisma.account.findUnique({ where: { accountRef: "ACC_401" } });
      accId = account!.id;
    });

    it("detects rapid forwarding and fan-out", async () => {
      const features = await extractFeatures(accId);
      
      expect(features.rapidForwardingCount).toBeGreaterThan(0);
      expect(features.fanOutCount).toBeGreaterThanOrEqual(5);
      expect(features.averageHoldingTimeMinutes).toBeGreaterThan(0);
      expect(features.averageHoldingTimeMinutes).toBeLessThan(15);
      expect(features.averageForwardingRatio).toBeGreaterThan(0.9); // 95%
    });

    it("detects repeated independent complaint trails", async () => {
      const features = await extractFeatures(accId);
      expect(features.distinctComplaintTrailCount).toBe(3);
    });

    it("assigns HIGH/CRITICAL risk score with proper signals to mule account", async () => {
      const risk = await analyzeAccountRisk(accId);
      
      expect(["HIGH", "CRITICAL"]).toContain(risk.level);
      expect(risk.score).toBeGreaterThanOrEqual(50);
      
      const signalTypes = risk.signals.map(s => s.signalType);
      expect(signalTypes).toContain("REPEATED_COMPLAINT_TRAILS");
      expect(signalTypes).toContain("HIGH_FAN_OUT");
      expect(signalTypes).toContain("RAPID_FORWARDING");
      expect(signalTypes).toContain("HIGH_FORWARDING_RATIO");
    });
    
    it("persists risk history and profile", async () => {
      const history = await prisma.riskHistory.findMany({ where: { accountId: accId }});
      expect(history.length).toBeGreaterThan(0);
      
      const account = await prisma.account.findUnique({ where: { id: accId } });
      expect(["high", "critical"]).toContain(account?.riskStatus);
      expect(account?.riskScore).toBeGreaterThanOrEqual(50);
    });
  });

  describe("Watchlist and Alerts", () => {
    let accId: string;

    beforeAll(async () => {
      const account = await prisma.account.findUnique({ where: { accountRef: "ACC_401" } });
      accId = account!.id;
    });

    it("allows manual addition to watchlist", async () => {
      await addToWatchlist(accId, "Suspicious behaviour detected");
      
      const account = await prisma.account.findUnique({ where: { id: accId }, include: { watchlist: true } });
      expect(account?.watchlistStatus).toBe("monitored");
      expect(account?.watchlist?.reason).toBe("Suspicious behaviour detected");
    });

    it("generates alert on watchlist activity", async () => {
      // Simulate new transaction importing
      const victim2 = await prisma.account.upsert({ where: { accountRef: "VIC_88" }, update: {}, create: { accountRef: "VIC_88" } });
      const txn = await prisma.transaction.create({
        data: { sourceTransactionId: "TXN_NEW_ACTIVITY", bankId: bank.id, timestamp: new Date(), senderAccountId: victim2.id, receiverAccountId: accId, amount: 50000 }
      });

      await checkWatchlistActivity(txn.id);

      const alerts = await prisma.alert.findMany({ where: { accountId: accId } });
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe("WATCHLIST_ACTIVITY");
      expect(alerts[0].title).toBe("Watchlist Account Activity");
      expect(["HIGH", "CRITICAL"]).toContain(alerts[0].severity); // inherited from account risk
    });
  });
});
