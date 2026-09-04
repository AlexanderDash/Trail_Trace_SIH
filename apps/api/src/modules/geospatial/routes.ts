import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { LocationResolver } from "./resolver.js";
import { analyzeGeospatialHotspots } from "./service.js";

export const geospatialRouter = Router();

// Get predicted hotspots (with deterministic cacheable output)
geospatialRouter.get("/hotspots", async (req, res) => {
  try {
    const hotspots = await analyzeGeospatialHotspots();
    res.json(hotspots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all transaction locations for a specific trail
geospatialRouter.get("/trails/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const trailNodes = await prisma.trailNode.findMany({
      where: { trailId: id },
      include: {
        account: {
          include: {
            sentTransactions: true,
            receivedTransactions: true
          }
        }
      },
      orderBy: { sequence: 'asc' }
    });

    const locations = [];
    const seen = new Set();

    for (const node of trailNodes) {
      const txns = [...node.account.sentTransactions, ...node.account.receivedTransactions]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      for (const t of txns) {
        if (!t.locationCity) continue;
        const coords = LocationResolver.resolve(t.locationCity);
        if (!coords) continue;
        
        const locKey = `${t.id}-${coords.city}`;
        if (!seen.has(locKey)) {
          seen.add(locKey);
          locations.push({
            transactionId: t.id,
            accountId: node.accountId,
            accountRef: node.account.accountRef,
            sequence: node.sequence,
            amount: t.amount,
            timestamp: t.timestamp,
            ...coords
          });
        }
      }
    }

    res.json(locations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all historical withdrawals
geospatialRouter.get("/withdrawals", async (req, res) => {
  try {
    const withdrawals = await prisma.locationEvent.findMany({
      where: { category: "withdrawal" }
    });

    const results = withdrawals.map(w => {
      let coords = null;
      if (w.latitude && w.longitude) {
        coords = { latitude: w.latitude, longitude: w.longitude, city: w.city };
      } else if (w.city) {
        coords = LocationResolver.resolve(w.city);
      }
      return {
        id: w.id,
        timestamp: w.observedAt,
        ...coords
      };
    }).filter(w => w.latitude != null);

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
