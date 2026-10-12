import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z
    .string({ error: "is missing" })
    .regex(/^postgres(ql)?:\/\//, "must be a PostgreSQL connection string"),
  JWT_SECRET: z
    .string({ error: "is missing" })
    .min(32, "must be at least 32 characters (try: openssl rand -hex 32)"),
  RESEND_API_KEY: z.string({ error: "is missing" }).min(1, "is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\nInvalid environment configuration:\n");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nCopy .env.example to .env and fill in the values.\n");
  process.exit(1);
}

export const env = parsed.data;
