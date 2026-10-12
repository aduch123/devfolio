import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { env } from "./env.js";
import logger from "./logger.js";

// Storage interface (D6): save(kind, buffer, ext) -> public url, remove(url). Callers never see file paths,
// so an S3-compatible implementation can replace this object without touching the controllers.
const root = path.resolve(
  env.UPLOAD_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../uploads"),
);
const PUBLIC_PREFIX = "/uploads";

export const storage = {
  root,

  async save(kind, buffer, ext) {
    const name = `${crypto.randomBytes(16).toString("hex")}${ext}`;
    const dir = path.join(root, kind);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buffer, { flag: "wx" });
    return `${PUBLIC_PREFIX}/${kind}/${name}`;
  },

  // Best effort: a missing file is fine, and only files inside the upload folder can be removed.
  async remove(url) {
    if (!url || !url.startsWith(`${PUBLIC_PREFIX}/`)) return;
    const file = path.resolve(root, url.slice(PUBLIC_PREFIX.length + 1));
    if (!file.startsWith(root + path.sep)) return;
    try {
      await fs.unlink(file);
    } catch (err) {
      if (err.code !== "ENOENT") logger.warn({ err, url }, "could not remove uploaded file");
    }
  },
};
