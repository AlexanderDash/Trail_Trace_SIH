import { prisma } from "../../lib/prisma.js";
import { LocationResolver } from "../geospatial/resolver.js";
import { extractGeospatialFeatures, MLFeatureVector } from "./features.js";

export interface TrainingSample {
  features: MLFeatureVector;
  targetCity: string;
  isPositive: boolean;
  timestamp: Date;
}

export async function generateTrainingDataset(): Promise<TrainingSample[]> {
  const dataset: TrainingSample[] = [];

  // Find all historical withdrawals to act as POSITIVE TARGETS
  const withdrawals = await prisma.locationEvent.findMany({
    where: { category: "withdrawal", observedAt: { not: null } },
    orderBy: { observedAt: 'asc' }
  });

  // Collect all known synthetic cities for negative sampling
  const allCities = ["Delhi", "Noida", "Jamtara", "Deoghar", "Mumbai", "Pune", "Dhanbad", "Ranchi"];

  for (const w of withdrawals) {
    if (!w.city || !w.observedAt) continue;
    
    const targetCoords = LocationResolver.resolve(w.city);
    if (!targetCoords) continue;

    // Positive sample (Prediction time is EXACTLY when the withdrawal happened)
    // The features extracted will strictly use `lt: w.observedAt` to prevent leakage.
    const posFeatures = await extractGeospatialFeatures(w.city, w.observedAt);
    dataset.push({
      features: posFeatures,
      targetCity: posFeatures.locationCity,
      isPositive: true,
      timestamp: w.observedAt
    });

    // Negative sample: Pick a random city where a withdrawal did NOT happen at this time
    const negCity = allCities.find(c => c !== targetCoords.city);
    if (negCity) {
      const negFeatures = await extractGeospatialFeatures(negCity, w.observedAt);
      dataset.push({
        features: negFeatures,
        targetCity: negFeatures.locationCity,
        isPositive: false,
        timestamp: w.observedAt
      });
    }
  }

  // Sort chronologically (important for temporal train/test split)
  return dataset.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
