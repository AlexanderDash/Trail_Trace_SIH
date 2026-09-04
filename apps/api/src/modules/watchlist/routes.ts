import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { addToWatchlist, updateWatchlistStatus, removeFromWatchlist } from "./service.js";

export const watchlistRouter = Router();

watchlistRouter.get("/", async (_req, res) => {
  try {
    const list = await prisma.watchlistAccount.findMany({
      include: { account: { include: { bank: true } } },
      orderBy: { addedAt: "desc" }
    });
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

watchlistRouter.post("/", async (req, res) => {
  try {
    const { accountId, reason, status } = req.body;
    if (!accountId) return res.status(400).json({ error: "accountId required" });
    const entry = await addToWatchlist(accountId, reason || "Manually added", status);
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

watchlistRouter.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    // req.params.id is accountId here for simplicity
    const entry = await updateWatchlistStatus(req.params.id, status);
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

watchlistRouter.delete("/:id", async (req, res) => {
  try {
    await removeFromWatchlist(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
