import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { analyzeAccountRisk } from "../risk/scorer.js";

export const accountsRouter = Router();

// List accounts (for risk table)
accountsRouter.get("/", async (req, res) => {
  try {
    const { search, bankCode, riskLevel, watchlistStatus } = req.query;

    const where: any = {};
    
    if (search) {
      where.accountRef = { contains: search as string };
    }
    
    if (bankCode) {
      where.bank = { code: bankCode as string };
    }
    
    if (riskLevel) {
      where.riskStatus = (riskLevel as string).toLowerCase();
    }

    if (watchlistStatus) {
      where.watchlistStatus = (watchlistStatus as string).toLowerCase();
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        bank: true,
        riskProfile: true,
        _count: {
          select: { trailNodes: true } // simple proxy for complaint trails count
        }
      },
      orderBy: { riskScore: "desc" },
      take: 100
    });

    res.json(accounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single account detail
accountsRouter.get("/:id", async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
      include: {
        bank: true,
        riskProfile: true,
        riskSignals: { orderBy: { severity: "desc" } },
        watchlist: true,
        trailNodes: { 
          include: { 
            trail: { include: { complaint: true } }
          }
        },
        sentTransactions: {
          include: { bank: true, receiverAccount: true },
          orderBy: { timestamp: "desc" },
          take: 5
        },
        receivedTransactions: {
          include: { bank: true, senderAccount: true },
          orderBy: { timestamp: "desc" },
          take: 5
        }
      }
    });

    if (!account) return res.status(404).json({ error: "Account not found" });

    // Combine recent transactions
    const recentTransactions = [...account.sentTransactions, ...account.receivedTransactions]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    res.json({
      ...account,
      recentTransactions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze risk (re-run risk engine)
accountsRouter.post("/:id/analyze", async (req, res) => {
  try {
    const result = await analyzeAccountRisk(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get risk history
accountsRouter.get("/:id/risk-history", async (req, res) => {
  try {
    const history = await prisma.riskHistory.findMany({
      where: { accountId: req.params.id },
      orderBy: { changedAt: "desc" }
    });
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
