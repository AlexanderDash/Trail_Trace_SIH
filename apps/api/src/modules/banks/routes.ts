import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

export const banksRouter = Router();

banksRouter.get("/", async (_req, res) => {
  const banks = await prisma.bank.findMany({ orderBy: { code: "asc" } });
  res.json({
    module: "data-sources",
    implemented: true,
    items: banks.map((bank) => ({
      id: bank.id,
      code: bank.code,
      name: bank.name,
      createdAt: bank.createdAt.toISOString(),
    })),
    message: "Registered source banks. File ingestion is not implemented yet.",
  });
});
