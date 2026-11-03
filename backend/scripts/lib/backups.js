import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
export function databaseEnvironment(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw Error();
  } catch {
    throw Error("A valid PostgreSQL connection URL is required");
  }
  if (!url.hostname || !url.pathname.slice(1))
    throw Error("Database host and database name are required");
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => /^PG[A-Z_]+$/.test(key) || ["PATH", "HOME", "LANG", "TMPDIR"].includes(key),
    ),
  );
  const result = {
    ...inherited,
    PGCONNECT_TIMEOUT: process.env.PGCONNECT_TIMEOUT || "10",
    PGHOST: url.hostname.replace(/^\[|\]$/g, ""),
    PGPORT: url.port || "5432",
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
  };
  for (const [parameter, key] of [
    ["sslmode", "PGSSLMODE"],
    ["sslrootcert", "PGSSLROOTCERT"],
    ["sslcert", "PGSSLCERT"],
    ["sslkey", "PGSSLKEY"],
  ])
    if (url.searchParams.has(parameter)) result[key] = url.searchParams.get(parameter);
  return result;
}
export async function pgTool(command, args, connectionString) {
  const env = databaseEnvironment(connectionString);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "ignore", "pipe"] });
    child.stderr?.resume();
    child.once("error", () =>
      reject(Error(`${command} could not start; install matching PostgreSQL client tools`)),
    );
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(Error(`${command} failed; credentials and database contents were not logged`)),
    );
  });
}
export async function createBackup({ connectionString, directory, uploadDirectory }) {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const root = await fs.mkdtemp(path.join(directory, "devfolio-"));
  await fs.chmod(root, 0o700);
  try {
    const file = path.join(root, "database.dump");
    await pgTool(
      "pg_dump",
      ["--format=custom", "--no-owner", "--no-acl", "--file", file],
      connectionString,
    );
    await fs.chmod(file, 0o600);
    let uploads = false;
    if (uploadDirectory) {
      let exists = true;
      try {
        await fs.access(uploadDirectory);
      } catch (error) {
        if (error.code === "ENOENT") exists = false;
        else throw error;
      }
      if (exists) {
        await fs.cp(uploadDirectory, path.join(root, "uploads"), {
          recursive: true,
          force: false,
          errorOnExist: true,
        });
        uploads = true;
      }
    }
    await fs.writeFile(
      path.join(root, "manifest.json"),
      JSON.stringify(
        { createdAt: new Date().toISOString(), database: "database.dump", uploads },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    return { root, file, uploads };
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true });
    throw error;
  }
}
export async function restoreDatabase({ file, connectionString }) {
  await fs.access(file);
  await pgTool(
    "pg_restore",
    [
      "--single-transaction",
      "--exit-on-error",
      "--no-owner",
      "--no-acl",
      "--dbname",
      databaseEnvironment(connectionString).PGDATABASE,
      file,
    ],
    connectionString,
  );
}

export function sameDatabase(a, b) {
  try {
    const left = databaseEnvironment(a),
      right = databaseEnvironment(b);
    const host = (value) =>
      ["localhost", "127.0.0.1", "::1"].includes(value.toLowerCase())
        ? "localhost"
        : value.toLowerCase();
    return (
      host(left.PGHOST) === host(right.PGHOST) &&
      left.PGPORT === right.PGPORT &&
      left.PGDATABASE === right.PGDATABASE
    );
  } catch {
    return false;
  }
}
