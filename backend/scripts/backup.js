import "dotenv/config";
import path from "node:path";
import { createBackup } from "./lib/backups.js";
try {
  const result = await createBackup({
    connectionString: process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL,
    directory: path.resolve(process.env.BACKUP_DIR || "backups"),
    uploadDirectory: path.resolve(process.env.UPLOAD_DIR || "uploads"),
  });
  console.log(`Backup created: ${result.root}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
