import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import { API, app, prisma, request, cleanupUsers, registerAndLogin } from "./helpers.js";
import { visitorHash, referrerHost } from "../modules/analytics/visitor.js";
import { rollupViews } from "../jobs/analyticsRetention.js";
before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});
const UA = "Devfolio integration visitor";
async function fixture() {
  const account = await registerAndLogin();
  const user = await prisma.user.findUnique({ where: { username: account.ident.username } });
  await prisma.profile.update({ where: { userId: user.id }, data: { published: true } });
  return { ...account, user, base: `${API}/portfolio/${account.ident.username}` };
}
it("deduplicates views, excludes owners/bots, counts private links and never stores raw identifiers", async () => {
  const { agent, user, base } = await fixture();
  await request(app)
    .post(`${base}/view`)
    .set("User-Agent", UA)
    .send({ referrer: "https://search.example/path?secret=1" })
    .expect(204);
  await request(app).post(`${base}/view`).set("User-Agent", UA).send({}).expect(204);
  await request(app).post(`${base}/view`).set("User-Agent", "Googlebot").send({}).expect(204);
  await agent.post(`${base}/view`).set("User-Agent", UA).send({}).expect(204);
  const views = await prisma.view.findMany({ where: { userId: user.id } });
  assert.equal(views.length, 1);
  assert.equal(views[0].referrerHost, "search.example");
  assert.match(views[0].visitorHash, /^[a-f0-9]{64}$/);
  assert.equal(views[0].ip, undefined);
  assert.equal(views[0].userAgent, undefined);
  const link = (await agent.post(`${API}/share-links`).send({ label: "Analytics" })).body;
  await request(app)
    .post(`${API}/portfolio/share/${link.token}/view`)
    .set("User-Agent", "Second visitor")
    .send({})
    .expect(204);
  assert.equal((await agent.get(`${API}/share-links`)).body.shareLinks[0].viewCount, 1);
  assert.equal((await agent.get(`${API}/analytics/summary?days=7`)).body.current.views, 2);
});
it("likes are idempotent and unlike works; drafts cannot be liked", async () => {
  const { agent, base } = await fixture();
  for (let i = 0; i < 2; i++)
    await request(app).post(`${base}/like`).set("User-Agent", UA).expect(200);
  let result = (await request(app).get(`${base}/engagement`).set("User-Agent", UA)).body;
  assert.equal(result.likes, 1);
  assert.equal(result.liked, true);
  result = (await request(app).delete(`${base}/like`).set("User-Agent", UA).expect(200)).body;
  assert.equal(result.likes, 0);
  assert.equal(result.liked, false);
  await agent.post(`${API}/profile/unpublish`).expect(200);
  await request(app).post(`${base}/like`).expect(404);
  const link = (await agent.post(`${API}/share-links`).send({ label: "Draft" })).body;
  await request(app).post(`${API}/portfolio/share/${link.token}/like`).expect(404);
});
it("validates clicks, aggregates the owner's data and enforces analytics authentication", async () => {
  const { agent, base, user } = await fixture();
  const project = (
    await agent
      .post(`${API}/projects`)
      .send({ title: "A project", repoUrl: "https://example.com/repo" })
  ).body.project;
  await request(app)
    .post(`${base}/click`)
    .set("User-Agent", UA)
    .send({ targetType: "PROJECT_REPO", target: project.repoUrl })
    .expect(204);
  await request(app)
    .post(`${base}/click`)
    .set("User-Agent", UA)
    .send({ targetType: "PROJECT_REPO", target: "https://unrelated.example" })
    .expect(400);
  await request(app)
    .post(`${base}/view`)
    .set("User-Agent", UA)
    .send({ referrer: "https://search.example/page" })
    .expect(204);
  assert.equal((await agent.get(`${API}/analytics/summary?days=7`)).body.current.clicks, 1);
  assert.equal(
    (await agent.get(`${API}/analytics/clicks?days=7`)).body.items[0].label,
    "A project",
  );
  assert.equal(
    (await agent.get(`${API}/analytics/sources?days=7`)).body.items[0].label,
    "search.example",
  );
  assert.equal((await agent.get(`${API}/analytics/devices?days=7`)).body.items[0].label, "desktop");
  assert.equal((await agent.get(`${API}/analytics/timeseries?days=7`)).body.series.length, 7);
  assert.ok((await agent.get(`${API}/activity`)).body.items.length >= 2);
  const { agent: other } = await registerAndLogin();
  assert.equal((await other.get(`${API}/analytics/summary`)).body.current.views, 0);
  await request(app).get(`${API}/analytics/summary`).expect(401);
  await agent.get(`${API}/analytics/summary?days=999`).expect(400);
  assert.equal(await prisma.clickEvent.count({ where: { userId: user.id } }), 1);
});
it("rotates view hashes daily but keeps like hashes stable and strips referrer paths", () => {
  const req = { ip: "192.0.2.1", headers: { "user-agent": UA } };
  const a = new Date("2026-01-01"),
    b = new Date("2026-01-02");
  assert.notEqual(visitorHash(req, "owner", { now: a }), visitorHash(req, "owner", { now: b }));
  assert.equal(
    visitorHash(req, "owner", { stable: true, now: a }),
    visitorHash(req, "owner", { stable: true, now: b }),
  );
  assert.notEqual(visitorHash(req, "owner", { now: a }), visitorHash(req, "other", { now: a }));
  assert.equal(referrerHost("https://example.com/private?secret=1"), "example.com");
  assert.equal(referrerHost("javascript:alert(1)"), null);
});
it("rolls old raw views into daily totals transactionally without double counting", async () => {
  const { agent, user } = await fixture();
  const old = new Date();
  old.setUTCMonth(old.getUTCMonth() - 14);
  old.setUTCHours(12, 0, 0, 0);
  await prisma.view.createMany({
    data: [0, 1].map((i) => ({
      userId: user.id,
      visitorHash: `old-${i}`,
      deviceType: "desktop",
      referrerHost: "search.example",
      windowStart: old,
      createdAt: old,
    })),
  });
  const first = await rollupViews();
  assert.equal(first.removed, 2);
  assert.equal(await prisma.view.count({ where: { userId: user.id } }), 0);
  const saved = await prisma.dailyMetric.findMany({ where: { userId: user.id } });
  assert.equal(saved[0].views, 2);
  assert.equal(saved[0].uniqueVisitors, 2);
  assert.equal(saved[0].sources["search.example"], 2);
  assert.equal((await rollupViews()).removed, 0);
  assert.equal((await agent.get(`${API}/analytics/summary`)).body.lifetimeViews, 2);
});
it(
  "aggregates charts for 100,000 seeded views under one second",
  { skip: process.env.RUN_ANALYTICS_PERF !== "1" },
  async () => {
    const { agent, user } = await fixture();
    await prisma.$executeRaw`INSERT INTO "View" ("id","userId","visitorHash","deviceType","windowStart","createdAt") SELECT md5(${user.id} || g::text), ${user.id}, md5(g::text), 'desktop', CURRENT_TIMESTAMP - ((g % 30) * INTERVAL '1 day'), CURRENT_TIMESTAMP - ((g % 30) * INTERVAL '1 day') FROM generate_series(1,100000) g`;
    const start = performance.now();
    const response = await agent.get(`${API}/analytics/timeseries?days=30`).expect(200);
    const elapsed = performance.now() - start;
    assert.equal(
      response.body.series.reduce((n, row) => n + row.views, 0),
      100000,
    );
    assert.ok(elapsed < 1000, `Chart API took ${Math.round(elapsed)}ms`);
    console.log(`100k-view chart API: ${Math.round(elapsed)}ms`);
  },
);
