import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$runCommandRaw({ ping: 1 });
  console.log("DATABASE_OK");
} catch (error) {
  console.log(`DATABASE_ERROR ${error?.code ?? error?.name ?? "unknown"}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
