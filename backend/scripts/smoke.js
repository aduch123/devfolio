// Quick end-to-end check of a RUNNING server (no test framework needed yet).
//   npm run smoke
// Env: SMOKE_URL (default http://localhost:<PORT or 5000>), SMOKE_USERNAME (optional: an existing
// user; enables the public portfolio check). Note: the validation check counts as one login/signup
// attempt toward the auth rate limit.
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const base = process.env.SMOKE_URL || `http://localhost:${process.env.PORT || 5000}`;
const username = process.env.SMOKE_USERNAME;
const PRIVATE_KEYS = ["id", "email", "passwordHash", "shareToken", "userId"];

let failed = 0;

const isErrorShape = (body) =>
  Boolean(body?.error) &&
  typeof body.error.code === "string" &&
  typeof body.error.message === "string";

const hasPrivateKey = (value) => {
  if (Array.isArray(value)) return value.some(hasPrivateKey);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => PRIVATE_KEYS.includes(k) || hasPrivateKey(v));
  }
  return false;
};

async function call(path, options) {
  const res = await fetch(`${base}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    // not JSON (for example an HTML page)
  }
  return { res, body };
}

async function check(name, fn) {
  try {
    const problem = await fn();
    if (problem) throw new Error(problem);
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}: ${err.message}`);
  }
}

console.log(`Smoke test against ${base}\n`);

await check("GET /healthz returns { status: 'ok' }", async () => {
  const { res, body } = await call("/healthz");
  if (res.status !== 200 || body?.status !== "ok")
    return `got ${res.status} ${JSON.stringify(body)}`;
});

await check("GET /auth/me without a session returns 401 in the standard shape", async () => {
  const { res, body } = await call("/api/v1/auth/me");
  if (res.status !== 401 || !isErrorShape(body)) return `got ${res.status} ${JSON.stringify(body)}`;
});

await check("POST /auth/refresh without a refresh cookie returns 401", async () => {
  const { res, body } = await call("/api/v1/auth/refresh", { method: "POST" });
  if (res.status !== 401 || body?.error?.code !== "NO_REFRESH_TOKEN")
    return `got ${res.status} ${JSON.stringify(body)}`;
});

await check("POST from a foreign Origin is refused (BAD_ORIGIN)", async () => {
  const { res, body } = await call("/api/v1/auth/logout", {
    method: "POST",
    headers: { Origin: "https://evil.example" },
  });
  if (res.status !== 403 || body?.error?.code !== "BAD_ORIGIN")
    return `got ${res.status} ${JSON.stringify(body)}`;
});

if (username) {
  await check(`GET public portfolio /${username} (no login, no private fields)`, async () => {
    const { res, body } = await call(`/api/v1/portfolio/${encodeURIComponent(username)}`);
    if (res.status !== 200) return `got ${res.status}`;
    if (body.username !== username.toLowerCase()) return "username missing";
    if (!Array.isArray(body.skills) || !Array.isArray(body.projects))
      return "skills or projects missing";
    if (hasPrivateKey(body))
      return "response contains a private field (id, email, passwordHash, shareToken)";
  });
} else {
  console.log("SKIP  public portfolio check (set SMOKE_USERNAME to an existing user)");
}

await check("GET unknown portfolio returns 404 USER_NOT_FOUND", async () => {
  const { res, body } = await call("/api/v1/portfolio/smoke-no-such-user");
  if (res.status !== 404 || !isErrorShape(body) || body.error.code !== "USER_NOT_FOUND") {
    return `got ${res.status} ${JSON.stringify(body)}`;
  }
});

await check("GET unknown API route returns 404 ROUTE_NOT_FOUND", async () => {
  const { res, body } = await call("/api/v1/does-not-exist");
  if (res.status !== 404 || !isErrorShape(body) || body.error.code !== "ROUTE_NOT_FOUND") {
    return `got ${res.status} ${JSON.stringify(body)}`;
  }
});

await check("POST login with empty body returns 400 VALIDATION_ERROR with fields", async () => {
  const { res, body } = await call("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (res.status !== 400 || !isErrorShape(body) || body.error.code !== "VALIDATION_ERROR") {
    return `got ${res.status} ${JSON.stringify(body)}`;
  }
  if (!body.error.fields || typeof body.error.fields !== "object") return "missing error.fields";
});

await check("App pages send a logged-out visitor to /login (no redirect loop)", async () => {
  const res = await fetch(`${base}/dashboard`, { redirect: "manual" });
  const to = res.headers.get("location");
  if (res.status !== 302 || to !== "/login?next=%2Fdashboard") return `got ${res.status} ${to}`;
  const wizard = await fetch(`${base}/onboarding`, { redirect: "manual" });
  if (wizard.status !== 302 || wizard.headers.get("location") !== "/login") {
    return `onboarding: got ${wizard.status} ${wizard.headers.get("location")}`;
  }
  const login = await fetch(`${base}/login`, { redirect: "manual" });
  if (login.status !== 200) return `/login: got ${login.status}`;
});

await check("Onboarding wizard endpoints need a session (401 in the standard shape)", async () => {
  const calls = [
    ["GET", "/api/v1/onboarding/state"],
    ["PUT", "/api/v1/onboarding/step/1"],
    ["POST", "/api/v1/onboarding/complete"],
  ];
  for (const [method, path] of calls) {
    const { res, body } = await call(path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(method === "PUT" ? { body: "{}" } : {}),
    });
    if (res.status !== 401 || !isErrorShape(body)) {
      return `${method} ${path}: got ${res.status} ${JSON.stringify(body)}`;
    }
  }
});

await check("Security headers present (CSP, no x-powered-by)", async () => {
  const { res } = await call("/");
  if (!res.headers.get("content-security-policy")) return "missing content-security-policy";
  if (res.headers.get("x-powered-by")) return "x-powered-by is exposed";
});

console.log(failed === 0 ? "\nAll checks passed." : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
