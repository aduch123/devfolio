import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const git = (args, options = {}) =>
  execFileSync("git", args, { cwd: root, maxBuffer: 128 * 1024 * 1024, ...options });
const findings = [];
let scanned = 0;
function inspect(file, bytes) {
  if (bytes.length > 2 * 1024 * 1024 || bytes.includes(0)) return;
  const content = bytes.toString("utf8");
  scanned++;
  const resend = content.match(/\bre_[A-Za-z0-9_-]{20,}\b/g) || [];
  if (resend.some((value) => !/^re_(?:x+|replace|dummy|test|ci_)/i.test(value)))
    findings.push({ file, kind: "Resend-shaped credential" });
  if (/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(content))
    findings.push({ file, kind: "private key material" });
  const passwords = [...content.matchAll(/postgres(?:ql)?:\/\/[^:\s/]+:([^@\s]+)@/g)].map(
    (match) => match[1],
  );
  if (
    passwords.some(
      (value) =>
        !/^(?:PASSWORD|PASS|pass|password|postgres|devfolio|build|ci-only-password|dummy(?:%40password)?|replace[^@]*|b|y|x)$/i.test(
          value,
        ),
    )
  )
    findings.push({ file, kind: "embedded database password" });
}
if (process.argv.includes("--history")) {
  const rows = git(["rev-list", "--objects", "--all"], { encoding: "utf8" }).trim().split("\n");
  const paths = new Map(
    rows
      .filter((row) => row.includes(" "))
      .map((row) => {
        const i = row.indexOf(" ");
        return [row.slice(0, i), row.slice(i + 1)];
      }),
  );
  if (paths.size) {
    const data = git(["cat-file", "--batch"], { input: [...paths.keys()].join("\n") + "\n" });
    let cursor = 0;
    while (cursor < data.length) {
      const newline = data.indexOf(10, cursor);
      if (newline < 0) break;
      const [oid, type, size] = data.subarray(cursor, newline).toString().split(" ");
      const end = newline + 1 + Number(size);
      if (type === "blob") inspect(paths.get(oid), data.subarray(newline + 1, end));
      cursor = end + 1;
    }
  }
} else {
  for (const file of git(["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)) {
    const full = path.join(root, file);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) inspect(file, fs.readFileSync(full));
  }
}
const unique = [...new Map(findings.map((item) => [`${item.file}:${item.kind}`, item])).values()];
console.log(JSON.stringify({ scanned, findings: unique }, null, 2));
if (unique.length) process.exitCode = 1;
