import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { 
  createInvestigation, 
  getInvestigationWorkspace, 
  addInvestigationNote, 
  addInvestigationFinding, 
  updateInvestigationStatus 
} from "./service.js";
import { generateInvestigationReportPdf } from "./report.js";

export const investigationsRouter = Router();

investigationsRouter.get("/", async (req, res) => {
  try {
    const list = await prisma.investigation.findMany({
      include: {
        complaints: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

investigationsRouter.post("/", async (req, res) => {
  try {
    const { complaintId } = req.body;
    if (!complaintId) throw new Error("complaintId is required");
    const inv = await createInvestigation(complaintId);
    res.json(inv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

investigationsRouter.get("/:id", async (req, res) => {
  try {
    const inv = await getInvestigationWorkspace(req.params.id);
    res.json(inv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

investigationsRouter.patch("/:id", async (req, res) => {
  try {
    const { status, priority, reason } = req.body;
    const inv = await updateInvestigationStatus(req.params.id, status, priority, reason);
    res.json(inv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

investigationsRouter.post("/:id/notes", async (req, res) => {
  try {
    const { content } = req.body;
    const note = await addInvestigationNote(req.params.id, content);
    res.json(note);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

investigationsRouter.post("/:id/findings", async (req, res) => {
  try {
    const { type, description } = req.body;
    const finding = await addInvestigationFinding(req.params.id, type, description);
    res.json(finding);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

investigationsRouter.get("/:id/report", async (req, res) => {
  try {
    const pdfBuffer = await generateInvestigationReportPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=investigation_${req.params.id}.pdf`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
