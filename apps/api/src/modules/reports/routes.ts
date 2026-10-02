import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { generateInvestigationReportPdf } from "../investigations/report.js";

export const reportsRouter = Router();

// GET /api/v1/reports - List cases ready for reports
reportsRouter.get("/", async (_req, res) => {
  try {
    const investigations = await prisma.investigation.findMany({
      include: {
        complaints: {
          include: {
            victimAccount: { select: { accountRef: true } },
            matchedTransaction: { select: { sourceTransactionId: true, amount: true } },
          },
        },
        _count: {
          select: {
            findings: true,
            investigationNotes: true,
            evidence: true,
            trails: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const reportList = investigations.map((inv) => {
      const primaryComplaint = inv.complaints[0];
      return {
        id: inv.id,
        caseNumber: inv.caseNumber,
        title: inv.title,
        status: inv.status,
        priority: inv.priority,
        description: inv.description,
        createdAt: inv.createdAt,
        closedAt: inv.closedAt,
        primaryComplaintRef: primaryComplaint?.complaintRef || "N/A",
        totalDisputedAmount: primaryComplaint ? Number(primaryComplaint.amount) : 0,
        victimAccount: primaryComplaint?.victimAccount?.accountRef || "N/A",
        matchedTransactionId: primaryComplaint?.matchedTransaction?.sourceTransactionId || null,
        findingsCount: inv._count.findings,
        notesCount: inv._count.investigationNotes,
        evidenceCount: inv._count.evidence,
        trailsCount: inv._count.trails,
        pdfUrl: `/api/v1/reports/${inv.id}/pdf`,
      };
    });

    res.json(reportList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/reports/summary - Overall report metrics
reportsRouter.get("/summary", async (_req, res) => {
  try {
    const [totalCases, openCases, findingsCount, complaints] = await Promise.all([
      prisma.investigation.count(),
      prisma.investigation.count({ where: { status: "OPEN" } }),
      prisma.investigationFinding.count(),
      prisma.complaint.findMany({ select: { amount: true } }),
    ]);

    const totalDisputedAmount = complaints.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    res.json({
      totalCases,
      openCases,
      closedCases: totalCases - openCases,
      findingsCount,
      totalDisputedAmount: Math.round(totalDisputedAmount),
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/reports/:id/pdf - Stream compiled PDF intelligence report
reportsRouter.get("/:id/pdf", async (req, res) => {
  try {
    const pdfBuffer = await generateInvestigationReportPdf(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=TrailTrace_Report_${req.params.id}.pdf`,
    );
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
