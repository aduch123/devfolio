import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import { API, prisma, request, app, cleanupUsers, registerAndLogin } from "./helpers.js";
import { runLinkChecks, activeChecks } from "../modules/health/health.service.js";
import { env } from "../config/env.js";
before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});
async function fixture() {
  const account = await registerAndLogin();
  const user = await prisma.user.findUnique({ where: { username: account.ident.username } });
  await account.agent
    .post(`${API}/projects`)
    .send({ title: "My project", repoUrl: "https://public.example/repo" })
    .expect(201);
  return { ...account, user };
}
it("reports pending checks, persists link results and clears repaired links", async () => {
  const { agent, user } = await fixture();
  let report = (await agent.get(`${API}/health/report`).expect(200)).body;
  assert.equal(report.checks[0].status, "PENDING");
  await runLinkChecks(user.id, {
    checker: async () => ({ status: "BROKEN", httpStatus: 404, reason: null }),
  });
  report = (await agent.get(`${API}/health/report`)).body;
  assert.equal(report.checks[0].status, "BROKEN");
  assert.equal(report.history.length, 1);
  assert.ok(report.suggestions.some((item) => item.key.startsWith("link:")));
  await runLinkChecks(user.id, {
    checker: async () => ({ status: "OK", httpStatus: 200, reason: null }),
  });
  report = (await agent.get(`${API}/health/report`)).body;
  assert.equal(report.checks[0].status, "OK");
  assert.equal(report.history.length, 2);
  assert.equal(report.categories.links, 25);
  const { agent: other } = await registerAndLogin();
  assert.equal((await other.get(`${API}/health/report`)).body.checks.length, 0);
  await request(app).get(`${API}/health/report`).expect(401);
});
it("dismisses only the owner's suggestions and deep links to exact editor fields", async () => {
  const { agent } = await fixture();
  const before = (await agent.get(`${API}/health/report`)).body;
  const suggestion = before.suggestions.find((item) => item.key === "headline");
  assert.match(suggestion.fix, /focus=profile%3Aprofile%3Aheadline/);
  await agent.post(`${API}/health/dismiss`).send({ key: suggestion.key }).expect(204);
  assert.ok(
    !(await agent.get(`${API}/health/report`)).body.suggestions.some(
      (item) => item.key === suggestion.key,
    ),
  );
  const { agent: other } = await registerAndLogin();
  assert.ok(
    (await other.get(`${API}/health/report`)).body.suggestions.some(
      (item) => item.key === suggestion.key,
    ),
  );
  await agent.delete(`${API}/health/dismiss/${encodeURIComponent(suggestion.key)}`).expect(204);
  assert.ok(
    (await agent.get(`${API}/health/report`)).body.suggestions.some(
      (item) => item.key === suggestion.key,
    ),
  );
});
it("reports asynchronous progress and rate limits rechecks without network access", async () => {
  const { agent, user } = await fixture();
  let release, entered;
  const ready = new Promise((resolve) => {
    entered = resolve;
  });
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const job = runLinkChecks(user.id, {
    checker: async () => {
      entered();
      await barrier;
      return { status: "OK", httpStatus: 200, reason: null };
    },
  });
  await ready;
  assert.ok(activeChecks.has(user.id));
  const report = (await agent.get(`${API}/health/report`)).body;
  assert.deepEqual(report.progress, { done: 0, total: 1 });
  const previous = env.NODE_ENV;
  env.NODE_ENV = "development";
  try {
    for (let i = 0; i < 5; i++) await agent.post(`${API}/health/links/recheck`).expect(202);
    await agent.post(`${API}/health/links/recheck`).expect(429);
  } finally {
    env.NODE_ENV = previous;
    release();
    await job;
  }
  assert.equal((await agent.get(`${API}/health/report`)).body.progress, null);
});
