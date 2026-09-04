import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const banks = [
    { code: "SBI", name: "State Bank of India" },
    { code: "BOB", name: "Bank of Baroda" },
    { code: "ICICI", name: "ICICI Bank" },
  ];

  for (const bank of banks) {
    await prisma.bank.upsert({
      where: { code: bank.code },
      update: { name: bank.name },
      create: bank,
    });
  }

  console.log("Seeded synthetic bank registry:", banks.map((b) => b.code).join(", "));
  console.log("No transactions, complaints, or trails were created. Counts on the dashboard come from the database.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
