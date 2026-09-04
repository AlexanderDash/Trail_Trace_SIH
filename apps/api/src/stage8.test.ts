import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getIntelligenceSummary, getNetworkGraph, getCrossComplaintCorrelations } from "./modules/intelligence/service.js";

const prisma = new PrismaClient();

async function seedStage8Data() {
  await prisma.investigationActivity.deleteMany();
  await prisma.investigationFinding.deleteMany();
  await prisma.investigationNote.deleteMany();
  await prisma.investigation.deleteMany();
  await prisma.trailConnection.deleteMany();
  await prisma.trailNode.deleteMany();
  await prisma.trail.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.locationEvent.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.complaintUpload.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.riskHistory.deleteMany();
  await prisma.riskSignal.deleteMany();
  await prisma.riskProfile.deleteMany();
  await prisma.watchlistAccount.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.account.deleteMany();
  await prisma.dataUpload.deleteMany();
  await prisma.bank.deleteMany();

  const bank = await prisma.bank.create({ data: { code: "SBI_S8", name: "State Bank 8" } });
  
  const victim1 = await prisma.account.create({ data: { accountRef: "VIC_S8_1" } });
  const victim2 = await prisma.account.create({ data: { accountRef: "VIC_S8_2" } });
  const sharedSuspect = await prisma.account.create({ data: { accountRef: "SUSP_S8" } });

  const c1 = await prisma.complaint.create({
    data: {
      complaintRef: "CMP_S8_1",
      victimAccountId: victim1.id,
      amount: 10000,
      timestamp: new Date(),
      investigationStatus: "MATCHED"
    }
  });

  const c2 = await prisma.complaint.create({
    data: {
      complaintRef: "CMP_S8_2",
      victimAccountId: victim2.id,
      amount: 20000,
      timestamp: new Date(),
      investigationStatus: "MATCHED"
    }
  });

  const t1 = await prisma.trail.create({ data: { complaintId: c1.id, status: "ACTIVE" } });
  const t2 = await prisma.trail.create({ data: { complaintId: c2.id, status: "ACTIVE" } });

  await prisma.trailNode.createMany({
    data: [
      { trailId: t1.id, accountId: victim1.id, role: "victim", sequence: 1 },
      { trailId: t1.id, accountId: sharedSuspect.id, role: "suspect", sequence: 2 },
      { trailId: t2.id, accountId: victim2.id, role: "victim", sequence: 1 },
      { trailId: t2.id, accountId: sharedSuspect.id, role: "suspect", sequence: 2 },
    ]
  });

  return { c1, c2, sharedSuspect };
}

describe("Stage 8 - Advanced Intelligence", () => {
  beforeAll(async () => {
    await seedStage8Data();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("calculates intelligence summary correctly", async () => {
    const summary = await getIntelligenceSummary();
    expect(summary.totalComplaints).toBe(2);
    expect(summary.matched).toBe(2);
    expect(summary.sharedAccountsAcrossCases).toBe(1); // the sharedSuspect
  });

  it("retrieves the cross-complaint correlations", async () => {
    const correlations = await getCrossComplaintCorrelations();
    expect(correlations.length).toBe(1);
    expect(correlations[0].accountRef).toBe("SUSP_S8");
    expect(Number(correlations[0].complaints)).toBe(2);
  });

  it("retrieves network graph nodes safely", async () => {
    const graph = await getNetworkGraph(1);
    expect(graph.nodes.length).toBe(4); // 2 victims + 2 suspect references (same account, diff trails)
    const hasSuspect = graph.nodes.some(n => n.accountId !== null);
    expect(hasSuspect).toBe(true);
  });
});
