import "dotenv/config";
import { restoreDatabase, sameDatabase } from "./lib/backups.js";
try {
  const connectionString = process.env.RESTORE_DATABASE_URL;
  if (
    !connectionString ||
    sameDatabase(connectionString, process.env.DATABASE_URL) ||
    sameDatabase(connectionString, process.env.DATABASE_URL_TEST) ||
    sameDatabase(connectionString, process.env.BACKUP_DATABASE_URL)
  )
    throw Error("Set RESTORE_DATABASE_URL to a separate, empty restore database");
  if (!process.argv[2]) throw Error("Provide the database.dump file path");
  await restoreDatabase({ file: process.argv[2], connectionString });
  console.log("Backup restored into the separate target database.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
