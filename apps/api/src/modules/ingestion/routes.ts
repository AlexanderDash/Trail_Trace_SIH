import { Router } from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { parseFile } from "./services/parser.js";
import { normalizeData, ValidationResult } from "./services/normalizer.js";
import { importTransactions } from "./services/importer.js";
import { listAdapters } from "./adapters/registry.js";
import path from "path";
import fs from "fs";

export const ingestionRouter = Router();
const prisma = new PrismaClient();

// Multer setup
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

ingestionRouter.get("/adapters", (_req, res) => {
  res.json({
    items: listAdapters().map((adapter) => ({
      code: adapter.code,
      label: adapter.label,
    })),
  });
});

ingestionRouter.get("/sources", async (_req, res) => {
  const sources = await prisma.dataUpload.findMany({
    include: { bank: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(sources);
});

ingestionRouter.get("/sources/:id", async (req, res) => {
  const source = await prisma.dataUpload.findUnique({
    where: { id: req.params.id },
    include: { bank: true }
  });
  if (!source) return res.status(404).json({ error: "Not found" });
  res.json(source);
});

ingestionRouter.delete("/sources/:id", async (req, res) => {
  await prisma.transaction.deleteMany({ where: { uploadId: req.params.id } });
  await prisma.dataUpload.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

ingestionRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    let { bankId } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: "Missing file" });
    }

    if (!bankId) {
      const fileNameUpper = file.originalname.toUpperCase();
      let code = "";
      let bankName = "";

      if (fileNameUpper.includes("SBI")) {
        code = "SBI"; bankName = "State Bank of India";
      } else if (fileNameUpper.includes("BOB") || fileNameUpper.includes("BARODA")) {
        code = "BOB"; bankName = "Bank of Baroda";
      } else if (fileNameUpper.includes("ICICI")) {
        code = "ICICI"; bankName = "ICICI Bank";
      } else if (fileNameUpper.includes("HDFC")) {
        code = "HDFC"; bankName = "HDFC Bank";
      } else if (fileNameUpper.includes("AXIS")) {
        code = "AXIS"; bankName = "Axis Bank";
      } else if (fileNameUpper.includes("PNB")) {
        code = "PNB"; bankName = "Punjab National Bank";
      } else {
        const baseName = path.parse(file.originalname).name.replace(/[^A-Za-z0-9_-]/g, "");
        code = (baseName.slice(0, 8) || "BANK").toUpperCase();
        bankName = baseName || "Bank";
      }

      let bank = await prisma.bank.findFirst({
        where: { OR: [{ code }, { name: bankName }] }
      });
      if (!bank) {
        bank = await prisma.bank.create({
          data: { code, name: bankName }
        });
      }
      bankId = bank.id;
    }

    const parsedData = await parseFile(file.path, file.mimetype || file.originalname);
    
    // Save to DataUpload
    const uploadRecord = await prisma.dataUpload.create({
      data: {
        bankId,
        fileName: file.originalname,
        originalFormat: file.mimetype || path.extname(file.originalname),
        status: "Mapping",
        rowCount: parsedData.length
      }
    });

    // We store the original file path in a temporary place or just rely on multer's file.path
    // For demo, we can just save it into columnMapping as metadata or rename it
    const permPath = path.join(uploadDir, uploadRecord.id + path.extname(file.originalname));
    fs.renameSync(file.path, permPath);

    // Extract columns
    const columns = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];
    
    res.json({
      upload: uploadRecord,
      columns,
      preview: parsedData.slice(0, 5)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ingestionRouter.post("/validate/:id", async (req, res) => {
  try {
    const { mapping } = req.body;
    const uploadId = req.params.id;
    
    const uploadRecord = await prisma.dataUpload.findUnique({ where: { id: uploadId } });
    if (!uploadRecord) return res.status(404).json({ error: "Not found" });

    // Re-parse the file
    const filePath = path.join(uploadDir, uploadId + path.extname(uploadRecord.fileName));
    const parsedData = await parseFile(filePath, uploadRecord.originalFormat);

    const validation = normalizeData(parsedData, mapping);

    // Update the record
    await prisma.dataUpload.update({
      where: { id: uploadId },
      data: {
        columnMapping: mapping,
        status: "Validated"
      }
    });

    // Don't send all data back, just the stats and top errors
    res.json({
      upload: uploadRecord,
      validation: {
        valid: validation.valid,
        invalid: validation.invalid,
        errors: validation.errors.slice(0, 100) // limit errors to 100 for UI
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ingestionRouter.post("/import/:id", async (req, res) => {
  try {
    const uploadId = req.params.id;
    
    const uploadRecord = await prisma.dataUpload.findUnique({ where: { id: uploadId } });
    if (!uploadRecord || !uploadRecord.columnMapping) {
      return res.status(400).json({ error: "Invalid upload record" });
    }

    const filePath = path.join(uploadDir, uploadId + path.extname(uploadRecord.fileName));
    const parsedData = await parseFile(filePath, uploadRecord.originalFormat);
    
    // As validation already happened, we just extract the valid ones
    const validation = normalizeData(parsedData, uploadRecord.columnMapping as Record<string, string>);

    if (validation.normalizedData.length === 0) {
      return res.status(400).json({ error: "No valid transactions to import" });
    }

    const importedCount = await importTransactions(uploadRecord.bankId, uploadId, validation.normalizedData);

    res.json({
      success: true,
      imported: importedCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
