import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { extractGeospatialFeatures } from "./modules/ml/features.js";
import { generateTrainingDataset } from "./modules/ml/dataset.js";
import { trainModel, predictHotspotsHybrid } from "./modules/ml/service.js";

const prisma = new PrismaClient();

async function seedStage6Data() {
  await prisma.modelVersion.deleteMany();
  await prisma.locationEvent.deleteMany();
  await prisma.trailConnection.deleteMany();
  await prisma.trailNode.deleteMany();
  await prisma.trail.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.watchlistAccount.deleteMany();
  await prisma.riskProfile.deleteMany();
  await prisma.account.deleteMany();

  const bank = await prisma.bank.upsert({ where: { code: "SBI" }, update: {}, create: { code: "SBI", name: "State Bank of India" } });

  const muleAcc = await prisma.account.create({
    data: {
      accountRef: "MULE_ML",
      riskScore: 80,
      riskStatus: "critical"
    }
  });

  // A withdrawal event at T = X
  const targetTime = new Date("2026-10-01T12:00:00Z");

  // Create transactions BEFORE targetTime
  await prisma.transaction.create({
    data: {
      sourceTransactionId: "TXN_B1",
      bankId: bank.id,
      timestamp: new Date("2026-10-01T10:00:00Z"),
      senderAccountId: muleAcc.id,
      receiverAccountId: muleAcc.id,
      amount: 1000,
      locationCity: "Jamtara"
    }
  });

  // Create transactions AFTER targetTime (LEAKAGE TEST)
  await prisma.transaction.create({
    data: {
      sourceTransactionId: "TXN_A1",
      bankId: bank.id,
      timestamp: new Date("2026-10-01T14:00:00Z"), // after withdrawal!
      senderAccountId: muleAcc.id,
      receiverAccountId: muleAcc.id,
      amount: 5000,
      locationCity: "Jamtara"
    }
  });

  // Create the historical withdrawal AT targetTime
  await prisma.locationEvent.create({
    data: {
      category: "withdrawal",
      city: "Jamtara",
      observedAt: targetTime,
    }
  });
}

describe("Stage 6 - Machine Learning Predictive Analytics", () => {
  beforeAll(async () => {
    await seedStage6Data();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Temporal Data Leakage Prevention", () => {
    it("only extracts features available strictly before the prediction timestamp", async () => {
      const targetTime = new Date("2026-10-01T12:00:00Z");
      const features = await extractGeospatialFeatures("Jamtara", targetTime);

      // Only the transaction at 10:00 should be counted. The 14:00 transaction must be ignored!
      expect(features.transactionsInArea24h).toBe(1);
      expect(features.transactionsInArea72h).toBe(1);
    });
  });

  describe("Training Dataset Generation", () => {
    it("generates positive and negative samples cleanly", async () => {
      const dataset = await generateTrainingDataset();
      
      // We inserted 1 withdrawal, so we expect 1 positive sample and 1 negative sample
      const pos = dataset.filter(d => d.isPositive);
      const neg = dataset.filter(d => !d.isPositive);

      expect(pos.length).toBe(1);
      expect(neg.length).toBe(1);
      
      // Positive sample should correctly map to Jamtara
      expect(pos[0].targetCity).toBe("Jamtara");
      // Negative sample should be another city
      expect(neg[0].targetCity).not.toBe("Jamtara");
    });
  });

  describe("ML Service Lifecycle & Fallback", () => {
    it("gracefully falls back to deterministic engine when insufficient data exists", async () => {
      // Trigger training
      const result = await trainModel();
      
      expect(result?.status).toBe("INSUFFICIENT_DATA");
      
      // Should have saved model state to DB
      const dbModel = await prisma.modelVersion.findFirst();
      expect(dbModel?.status).toBe("INSUFFICIENT_DATA");
      
      // Hybrid prediction should still work, falling back to ruleScore
      const hotspots = await predictHotspotsHybrid();
      expect(hotspots).toBeDefined();
      expect(hotspots.length).toBeGreaterThan(0);
      expect(hotspots[0].mlScore).toBeNull(); // No ML score provided
      expect(hotspots[0].finalScore).toBe(hotspots[0].ruleScore);
    });
  });
});
