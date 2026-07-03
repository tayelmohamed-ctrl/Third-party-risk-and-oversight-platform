import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function connectDb() {
  await prisma.$connect();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

export async function runMigrations() {
  // Prisma migrate deploy is run via npm script; this verifies connectivity.
  await prisma.$queryRaw`SELECT 1`;
}
