import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { prisma, cleanupUsers, registerAndLogin } from "./helpers.js";
import {
  createBackup,
  restoreDatabase,
  databaseEnvironment,
  sameDatabase,
} from "../scripts/lib/backups.js";
before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});
it("keeps database credentials out of arguments and excludes unrelated application secrets", () => {
  const env = databaseEnvironment(
    "postgresql://user:dummy%40password@localhost:5432/testdb?sslmode=verify-full",
  );
  assert.equal(env.PGPASSWORD, "dummy@password");
  assert.equal(env.PGSSLMODE, "verify-full");
  assert.ok(!Object.hasOwn(env, "RESEND_API_KEY"));
  assert.ok(!Object.hasOwn(env, "JWT_SECRET"));
  assert.equal(
    sameDatabase(
      "postgresql://a:b@localhost/main?sslmode=require",
      "postgresql://x:y@127.0.0.1:5432/main",
    ),
    true,
  );
  assert.equal(
    sameDatabase("postgresql://a:b@localhost/main", "postgresql://a:b@localhost/restore"),
    false,
  );
});
it(
  "backs up the isolated database and uploads, then restores a clean temporary database",
  { skip: process.env.RUN_BACKUP_RESTORE !== "1" },
  async () => {
    const { ident } = await registerAndLogin();
    const connectionString = process.env.DATABASE_URL;
    const admin = new pg.Client({ connectionString });
    await admin.connect();
    const name = `devfolio_restore_${crypto.randomBytes(8).toString("hex")}`,
      url = new URL(connectionString);
    url.pathname = `/${name}`;
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "devfolio-backup-check-")),
      uploads = path.join(directory, "source-uploads");
    await fs.mkdir(uploads);
    await fs.writeFile(path.join(uploads, "probe.txt"), "backup fixture only");
    let created = false,
      restored;
    try {
      await admin.query(`CREATE DATABASE "${name}"`);
      created = true;
      const backup = await createBackup({ connectionString, directory, uploadDirectory: uploads });
      assert.equal((await fs.stat(backup.file)).mode & 0o777, 0o600);
      assert.equal((await fs.stat(backup.root)).mode & 0o777, 0o700);
      assert.equal(
        await fs.readFile(path.join(backup.root, "uploads", "probe.txt"), "utf8"),
        "backup fixture only",
      );
      await restoreDatabase({ file: backup.file, connectionString: url.href });
      restored = new pg.Client({ connectionString: url.href });
      await restored.connect();
      const result = await restored.query(
        'SELECT COUNT(*)::int AS count FROM "User" WHERE "email"=$1',
        [ident.email],
      );
      assert.equal(result.rows[0].count, 1);
      console.log(
        "Backup restored successfully into a clean temporary database; fixture row and upload copy verified.",
      );
    } finally {
      if (restored) await restored.end();
      if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      await admin.end();
      await fs.rm(directory, { recursive: true, force: true });
    }
  },
);
