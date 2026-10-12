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
  // Sender shown on contact emails. The default is Resend's test sender, which only
  // delivers to the Resend account owner until a domain is verified (Phase 6).
  RESEND_FROM: z
    .string()
    .trim()
    .default("Devfolio <onboarding@resend.dev>")
    .refine(
      (v) => /^(?:[^<>@]+ <[^<>@\s]+@[^<>@\s]+>|[^<>@\s]+@[^<>@\s]+)$/.test(v),
      'must look like "Devfolio <noreply@example.com>" or "noreply@example.com"'
    ),
  // Public address of the site, used for links in emails. Default: http://localhost:<PORT>.
  APP_URL: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https?:\/\/[^/\s]+$/.test(v), "must be an origin like https://devfolio.example (no trailing slash or path)"),
  // How many reverse proxies sit in front of the app (0 or "false" = none). Needed for correct client IPs.
  TRUST_PROXY: z
    .string()
    .trim()
    .default("false")
    .refine((v) => v !== "true", "use the number of proxy hops (for example 1), not true")
    .transform((v) => (v === "false" ? false : /^\d+$/.test(v) ? Number(v) : v)),
  // Where uploaded images and resumes are stored (optional, default backend/uploads).
  UPLOAD_DIR: z.string().trim().min(1).optional(),
  // Most projects a user may mark as featured.
  MAX_FEATURED_PROJECTS: z.coerce.number().int().min(0).max(20).default(3),
  // Comma-separated browser origins allowed to call the API cross-origin. Empty = same-origin only.
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((v) => v.split(",").map((o) => o.trim()).filter(Boolean))
    .refine((list) => list.every((o) => /^https?:\/\/[^/\s]+$/.test(o)), "must be origins like https://example.com, comma-separated"),
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
