// Imported first by every test file: points the app at the test database before config/env.js runs.
// (Test-only exception to "all env access goes through config/env.js", like prisma.config.ts.)
import "dotenv/config";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error("DATABASE_URL_TEST is not set. Add it to backend/.env (a separate database, see .env.example).");
}
if (testUrl === process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_TEST must not be the same as DATABASE_URL: tests write to the database.");
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testUrl;
process.env.RESEND_API_KEY ||= "re_test_dummy";
process.env.JWT_SECRET ||= "test-secret-test-secret-test-secret-0123456789";
