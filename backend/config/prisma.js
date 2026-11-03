import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_SIZE,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
});
const prisma = new PrismaClient({ adapter });

export default prisma;
