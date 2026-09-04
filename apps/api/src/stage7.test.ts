import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { 
  createInvestigation, 
  getInvestigationWorkspace, 
  addInvestigationNote, 
  addInvestigationFinding, 
  updateInvestigationStatus 
} from "./modules/investigations/service.js";

const prisma = new PrismaClient();

async function seedStage7Data() {
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
  await prisma.transaction.deleteMany();
  await prisma.riskHistory.deleteMany();
  await prisma.riskSignal.deleteMany();
  await prisma.riskProfile.deleteMany();
  await prisma.watchlistAccount.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.account.deleteMany();
  await prisma.dataUpload.deleteMany();
  await prisma.bank.deleteMany();

  const bank = await prisma.bank.create({ data: { code: "SBI_TEST", name: "State Bank" } });
  
  const victim = await prisma.account.create({ data: { accountRef: "VIC_S7" } });
  
  const complaint = await prisma.complaint.create({
    data: {
      complaintRef: "CMP_S7",
      victimAccountId: victim.id,
      amount: 10000,
      timestamp: new Date()
    }
  });

  const trail = await prisma.trail.create({
    data: {
      complaintId: complaint.id,
      status: "ACTIVE"
    }
  });

  return complaint.id;
}

describe("Stage 7 - Investigation Workspace", () => {
  let complaintId: string;
  let investigationId: string;

  beforeAll(async () => {
    complaintId = await seedStage7Data();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Investigation Lifecycle", () => {
    it("creates an investigation from a complaint", async () => {
      const inv = await createInvestigation(complaintId);
      expect(inv!.caseNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(inv!.status).toBe("IN_PROGRESS");
      expect(inv!.priority).toBe("HIGH");
      investigationId = inv!.id;
    });

    it("prevents creating duplicate investigations for the same complaint", async () => {
      const inv2 = await createInvestigation(complaintId);
      expect(inv2!.id).toBe(investigationId); // should return the same one
    });

    it("retrieves the full workspace context", async () => {
      const workspace = await getInvestigationWorkspace(investigationId);
      expect(workspace!.id).toBe(investigationId);
      expect(workspace!.complaints.length).toBe(1);
      expect(workspace!.trails.length).toBe(1);
    });
  });

  describe("Notes and Findings", () => {
    it("adds an investigator note", async () => {
      const note = await addInvestigationNote(investigationId, "Suspicious activity near Jamtara");
      expect(note.content).toBe("Suspicious activity near Jamtara");
      
      const workspace = await getInvestigationWorkspace(investigationId);
      expect(workspace.investigationNotes.length).toBe(1);
      expect(workspace.activities.some(a => a.type === "NOTE_ADDED")).toBe(true);
    });

    it("adds an investigator finding", async () => {
      const finding = await addInvestigationFinding(investigationId, "LOCATION_ASSESSMENT", "Jamtara is confirmed hotspot");
      expect(finding.type).toBe("LOCATION_ASSESSMENT");

      const workspace = await getInvestigationWorkspace(investigationId);
      expect(workspace.findings.length).toBe(1);
      expect(workspace.activities.some(a => a.type === "FINDING_ADDED")).toBe(true);
    });
  });

  describe("Status Transitions", () => {
    it("updates status and logs activity", async () => {
      await updateInvestigationStatus(investigationId, "CLOSED", "CRITICAL", "Evidence forwarded to LEA");
      
      const workspace = await getInvestigationWorkspace(investigationId);
      expect(workspace.status).toBe("CLOSED");
      expect(workspace.priority).toBe("CRITICAL");
      expect(workspace.closedAt).not.toBeNull();
      expect(workspace.activities.some(a => a.type === "STATUS_CHANGED" && a.description.includes("LEA"))).toBe(true);
    });
  });
});
