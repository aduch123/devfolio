// Applies migrations to the test database (DATABASE_URL_TEST).
// Usage: npm run migrate:test
import "dotenv/config";
import { spawnSync } from "node:child_process";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  console.error("DATABASE_URL_TEST is not set in backend/.env");
  process.exit(1);
}
if (testUrl === process.env.DATABASE_URL) {
  console.error("DATABASE_URL_TEST must differ from DATABASE_URL. Aborting.");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: testUrl },
});
process.exit(result.status ?? 1);
