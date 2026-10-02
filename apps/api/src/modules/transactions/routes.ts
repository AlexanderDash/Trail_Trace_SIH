import { Router } from "express";
import { prisma } from "../../lib/prisma.js";

export const transactionsRouter = Router();

// GET /api/v1/transactions - List & search transactions
transactionsRouter.get("/", async (req, res) => {
  try {
    const {
      search,
      bankId,
      mode,
      account,
      limit = "50",
      offset = "0",
      sortBy = "timestamp",
      sortOrder = "desc",
    } = req.query;

    const take = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 200);
    const skip = Math.max(parseInt(offset as string, 10) || 0, 0);

    const whereConditions: any[] = [];

    if (bankId) {
      whereConditions.push({ bankId: bankId as string });
    }

    if (mode) {
      whereConditions.push({ transactionMode: mode as string });
    }

    if (account) {
      whereConditions.push({
        OR: [
          { senderAccount: { accountRef: { contains: account as string } } },
          { receiverAccount: { accountRef: { contains: account as string } } },
        ],
      });
    }

    if (search) {
      const q = (search as string).trim();
      whereConditions.push({
        OR: [
          { sourceTransactionId: { contains: q } },
          { locationCity: { contains: q } },
          { senderAccount: { accountRef: { contains: q } } },
          { receiverAccount: { accountRef: { contains: q } } },
        ],
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const [total, items] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        take,
        skip,
        orderBy: {
          [sortBy as string]: sortOrder === "asc" ? "asc" : "desc",
        },
        include: {
          bank: { select: { id: true, code: true, name: true } },
          senderAccount: { select: { id: true, accountRef: true, riskScore: true, riskStatus: true } },
          receiverAccount: { select: { id: true, accountRef: true, riskScore: true, riskStatus: true } },
          _count: {
            select: {
              matchedComplaints: true,
              trailConnections: true,
            },
          },
        },
      }),
    ]);

    res.json({
      items,
      total,
      limit: take,
      offset: skip,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/transactions/stats - Summary statistics
transactionsRouter.get("/stats", async (_req, res) => {
  try {
    const [totalCount, transactions, modeGroups, bankGroups] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.findMany({
        select: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["transactionMode"],
        _count: { id: true },
      }),
      prisma.transaction.groupBy({
        by: ["bankId"],
        _count: { id: true },
      }),
    ]);

    const totalVolume = transactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const banks = await prisma.bank.findMany({
      where: { id: { in: bankGroups.map((b) => b.bankId) } },
      select: { id: true, code: true, name: true },
    });
    const bankMap = new Map(banks.map((b) => [b.id, b.code]));

    res.json({
      totalCount,
      totalVolume: Math.round(totalVolume),
      modes: modeGroups.map((m) => ({
        mode: m.transactionMode || "UNKNOWN",
        count: m._count.id,
      })),
      banks: bankGroups.map((b) => ({
        bankCode: bankMap.get(b.bankId) || b.bankId,
        count: b._count.id,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/transactions/:id - Detail lookup
transactionsRouter.get("/:id", async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        bank: true,
        senderAccount: {
          include: {
            riskProfile: true,
            watchlist: true,
          },
        },
        receiverAccount: {
          include: {
            riskProfile: true,
            watchlist: true,
          },
        },
        upload: true,
        matchedComplaints: true,
        locationEvents: true,
        trailConnections: {
          include: {
            trail: true,
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
