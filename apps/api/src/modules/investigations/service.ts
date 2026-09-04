import { prisma } from "../../lib/prisma.js";

// Generate case number like INV-YYYY-0001
async function generateCaseNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.investigation.count({
    where: { caseNumber: { startsWith: `INV-${year}-` } }
  });
  return `INV-${year}-${(count + 1).toString().padStart(4, "0")}`;
}

export async function createInvestigation(complaintId: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { trails: true }
  });

  if (!complaint) throw new Error("Complaint not found");

  // Check if it already has an investigation
  if (complaint.investigationId) {
    return prisma.investigation.findUnique({ where: { id: complaint.investigationId } });
  }

  const caseNumber = await generateCaseNumber();

  const inv = await prisma.investigation.create({
    data: {
      caseNumber,
      title: `Cybercrime Investigation - ${complaint.complaintRef}`,
      description: `Investigation initiated from complaint ${complaint.complaintRef}`,
      status: "IN_PROGRESS",
      priority: "HIGH",
    }
  });

  // Link Complaint
  await prisma.complaint.update({
    where: { id: complaintId },
    data: { investigationId: inv.id }
  });

  // Link Trails
  for (const trail of complaint.trails) {
    await prisma.trail.update({
      where: { id: trail.id },
      data: { investigationId: inv.id }
    });
  }

  // Log activity
  await prisma.investigationActivity.create({
    data: {
      investigationId: inv.id,
      type: "CREATED",
      description: `Investigation ${caseNumber} created from complaint ${complaint.complaintRef}`,
    }
  });

  return inv;
}

export async function getInvestigationWorkspace(id: string) {
  const inv = await prisma.investigation.findUnique({
    where: { id },
    include: {
      complaints: {
        include: {
          victimAccount: true,
          matchedTransaction: {
            include: { bank: true }
          }
        }
      },
      trails: {
        include: {
          nodes: {
            include: { account: true },
            orderBy: { sequence: 'asc' }
          }
        }
      },
      investigationNotes: { orderBy: { createdAt: 'desc' } },
      findings: { orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' } },
      alerts: true,
    }
  });
  
  if (!inv) throw new Error("Investigation not found");

  // Get Risk and Watchlist info for involved accounts
  const accountIds = new Set<string>();
  inv.trails.forEach(t => t.nodes.forEach(n => accountIds.add(n.accountId)));

  const accountsData = await prisma.account.findMany({
    where: { id: { in: Array.from(accountIds) } },
    include: {
      riskProfile: true,
      riskSignals: true,
      watchlist: true
    }
  });

  return { ...inv, accountsContext: accountsData };
}

export async function addInvestigationNote(id: string, content: string, author: string = "Investigator") {
  const note = await prisma.investigationNote.create({
    data: { investigationId: id, content, author }
  });
  await prisma.investigationActivity.create({
    data: { investigationId: id, type: "NOTE_ADDED", description: `Investigator added a note.` }
  });
  return note;
}

export async function addInvestigationFinding(id: string, type: string, description: string) {
  const finding = await prisma.investigationFinding.create({
    data: { investigationId: id, type, description }
  });
  await prisma.investigationActivity.create({
    data: { investigationId: id, type: "FINDING_ADDED", description: `Investigator added a ${type} finding.` }
  });
  return finding;
}

export async function updateInvestigationStatus(id: string, status: string, priority: string, reason?: string) {
  const data: any = { status, priority };
  if (status === "CLOSED") {
    data.closedAt = new Date();
  } else {
    data.closedAt = null;
  }

  const updated = await prisma.investigation.update({
    where: { id },
    data
  });

  await prisma.investigationActivity.create({
    data: { 
      investigationId: id, 
      type: "STATUS_CHANGED", 
      description: `Status changed to ${status}, Priority ${priority}. ${reason ? `Reason: ${reason}` : ''}` 
    }
  });

  return updated;
}
