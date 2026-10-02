import { config } from "./config.js";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`ANVESH API listening on http://localhost:${config.port}`);
  console.log("Synthetic demo only. No ATM control or transaction blocking.");
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
