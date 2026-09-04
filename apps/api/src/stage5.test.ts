import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { LocationResolver } from "./modules/geospatial/resolver.js";
import { analyzeGeospatialHotspots } from "./modules/geospatial/service.js";

const prisma = new PrismaClient();

async function seedStage5Data() {
  const bank = await prisma.bank.upsert({ where: { code: "SBI" }, update: {}, create: { code: "SBI", name: "State Bank of India" } });

  // Clear relevant tables
  await prisma.locationEvent.deleteMany();
  await prisma.trailConnection.deleteMany();
  await prisma.trailNode.deleteMany();
  await prisma.trail.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.watchlistAccount.deleteMany();
  await prisma.riskProfile.deleteMany();
  await prisma.account.deleteMany();

  // Create High Risk Account
  const muleAcc = await prisma.account.create({
    data: {
      accountRef: "MULE_100",
      riskScore: 85,
      riskStatus: "critical"
    }
  });

  // Transactions in Delhi (Hotspot 1)
  for (let i = 0; i < 5; i++) {
    const from = await prisma.account.create({ data: { accountRef: `VIC_D_${i}` }});
    await prisma.transaction.create({
      data: {
        sourceTransactionId: `TXN_D_${i}`,
        bankId: bank.id,
        timestamp: new Date(),
        senderAccountId: from.id,
        receiverAccountId: muleAcc.id,
        amount: 10000,
        locationCity: "Delhi"
      }
    });
  }

  // Create a trail in Delhi
  const complaint = await prisma.complaint.create({ data: { complaintRef: "CMP_GEO_1", amount: 10000, timestamp: new Date(), victimAccountId: muleAcc.id }});
  const trail = await prisma.trail.create({ data: { complaintId: complaint.id }});
  await prisma.trailNode.create({ data: { trailId: trail.id, accountId: muleAcc.id, sequence: 1, role: 'intermediate' }});

  // Transactions in Jamtara (Hotspot 2 - pure historical withdrawals + low risk txns)
  await prisma.locationEvent.create({
    data: {
      category: "withdrawal",
      city: "Jamtara",
      observedAt: new Date()
    }
  });
  await prisma.locationEvent.create({
    data: {
      category: "withdrawal",
      city: "Jamtara",
      observedAt: new Date()
    }
  });

  // Watchlist account in Jamtara
  const watched = await prisma.account.create({ data: { accountRef: "WATCHED_1", watchlistStatus: "monitored" } });
  const other = await prisma.account.create({ data: { accountRef: "OTHER_1" } });
  
  await prisma.transaction.create({
    data: {
      sourceTransactionId: `TXN_J_1`,
      bankId: bank.id,
      timestamp: new Date(),
      senderAccountId: other.id,
      receiverAccountId: watched.id,
      amount: 50000,
      locationCity: "Jamtara"
    }
  });
}

describe("Stage 5 - Predictive Geospatial Intelligence", () => {
  beforeAll(async () => {
    await seedStage5Data();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("LocationResolver", () => {
    it("resolves known cities accurately", () => {
      const delhi = LocationResolver.resolve("Delhi");
      expect(delhi?.latitude).toBe(28.7041);
      expect(delhi?.longitude).toBe(77.1025);

      const fuzzy = LocationResolver.resolve("  new delhi ");
      expect(fuzzy?.city).toBe("New Delhi");
    });

    it("returns null for unknown cities gracefully", () => {
      expect(LocationResolver.resolve("Atlantis")).toBeNull();
      expect(LocationResolver.resolve("")).toBeNull();
      expect(LocationResolver.resolve(null)).toBeNull();
    });
  });

  describe("Hotspot Clustering & Scoring", () => {
    it("aggregates activity by city and calculates score correctly", async () => {
      const hotspots = await analyzeGeospatialHotspots();
      
      expect(hotspots.length).toBeGreaterThan(0);
      
      const delhi = hotspots.find(h => h.city === "Delhi");
      expect(delhi).toBeDefined();
      expect(delhi?.transactionCount).toBe(5);
      expect(delhi?.trailCount).toBe(1);
      expect(delhi?.accountCount).toBeGreaterThanOrEqual(1); // MULE_100
      expect(delhi?.score).toBeGreaterThan(0);
      expect(["MEDIUM", "HIGH", "CRITICAL"]).toContain(delhi?.riskLevel);
      expect(delhi?.reasons.length).toBeGreaterThan(0);

      const jamtara = hotspots.find(h => h.city === "Jamtara");
      expect(jamtara).toBeDefined();
      expect(jamtara?.historicalWithdrawalCount).toBe(2);
      expect(jamtara?.transactionCount).toBe(1); // WATCHED_1 txn
    });
  });
});
