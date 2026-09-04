import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const txns = await prisma.transaction.count();
  const accounts = await prisma.account.count();
  const complaints = await prisma.complaint.count();
  const trails = await prisma.trail.count();
  const withdrawals = await prisma.locationEvent.count({ where: { category: "withdrawal" } });
  const riskyAccounts = await prisma.account.count({ where: { riskScore: { gte: 50 } } });

  console.log(JSON.stringify({ txns, accounts, complaints, trails, withdrawals, riskyAccounts }, null, 2));
}

main().finally(() => prisma.$disconnect());
