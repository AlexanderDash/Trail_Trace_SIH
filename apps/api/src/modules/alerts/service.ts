import { prisma } from "../../lib/prisma.js";

export interface CreateAlertInput {
  accountId?: string;
  type: string;
  severity: string; // INFO, LOW, MEDIUM, HIGH, CRITICAL
  title: string;
  message: string;
}

export async function createAlert(input: CreateAlertInput) {
  return prisma.alert.create({
    data: {
      accountId: input.accountId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
    }
  });
}

export async function listAlerts() {
  return prisma.alert.findMany({
    include: { account: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function acknowledgeAlert(id: string) {
  return prisma.alert.update({
    where: { id },
    data: { acknowledged: true }
  });
}
