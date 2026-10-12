import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { API, app, prisma, request, cleanupUsers, errorOf, registerAndLogin } from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

const create = async (agent, path, body) =>
  (await agent.post(`${API}/${path}`).send(body).expect(201)).body;
const ids = (items) => items.map((i) => i.id);

describe("projects", () => {
  const project = (title, extra = {}) => ({ title, ...extra });

  it("creates in order, reorders, and the public page follows the saved order", async () => {
    const { agent, ident } = await registerAndLogin();
    const a = (await create(agent, "projects", project("A"))).project.id;
    const b = (await create(agent, "projects", project("B"))).project.id;
    const c = (await create(agent, "projects", project("C"))).project.id;
    assert.deepEqual(ids((await agent.get(`${API}/projects`).expect(200)).body.projects), [
      a,
      b,
      c,
    ]);

    await agent
      .put(`${API}/projects/order`)
      .send({ ids: [c, a, b] })
      .expect(204);
    assert.deepEqual(ids((await agent.get(`${API}/projects`).expect(200)).body.projects), [
      c,
      a,
      b,
    ]);

    const pub = await request(app).get(`${API}/portfolio/${ident.username}`).expect(200);
    assert.deepEqual(
      pub.body.projects.map((p) => p.title),
      ["C", "A", "B"],
    );

    const d = (await create(agent, "projects", project("D"))).project.id;
    assert.deepEqual(ids((await agent.get(`${API}/projects`).expect(200)).body.projects), [
      c,
      a,
      b,
      d,
    ]);
  });

  it("limits featured projects (default 3) and frees a slot when one is unfeatured", async () => {
    const { agent } = await registerAndLogin();
    const made = [];
    for (const t of ["A", "B", "C"])
      made.push((await create(agent, "projects", project(t, { featured: true }))).project.id);
    errorOf(
      await agent.post(`${API}/projects`).send(project("D", { featured: true })),
      409,
      "FEATURED_LIMIT",
    );
    const d = (await create(agent, "projects", project("D"))).project.id;
    errorOf(
      await agent.patch(`${API}/projects/${d}`).send({ featured: true }),
      409,
      "FEATURED_LIMIT",
    );
    await agent.patch(`${API}/projects/${made[0]}`).send({ featured: false }).expect(200);
    await agent.patch(`${API}/projects/${d}`).send({ featured: true }).expect(200);
  });

  it("answers 404 for another user's project (edit, delete, reorder) and changes nothing", async () => {
    const one = await registerAndLogin();
    const two = await registerAndLogin();
    const mine = (await create(one.agent, "projects", project("Mine"))).project.id;
    const theirs = (await create(two.agent, "projects", project("Theirs"))).project.id;
    errorOf(
      await two.agent.patch(`${API}/projects/${mine}`).send({ title: "x" }),
      404,
      "PROJECT_NOT_FOUND",
    );
    errorOf(await two.agent.delete(`${API}/projects/${mine}`), 404, "PROJECT_NOT_FOUND");
    errorOf(
      await one.agent.put(`${API}/projects/order`).send({ ids: [mine, theirs] }),
      404,
      "PROJECT_NOT_FOUND",
    );
    assert.equal(
      (await one.agent.get(`${API}/projects`).expect(200)).body.projects[0].title,
      "Mine",
    );
  });

  it("rejects an incomplete order and a missing body; needs a login", async () => {
    const { agent } = await registerAndLogin();
    const a = (await create(agent, "projects", project("A"))).project.id;
    await create(agent, "projects", project("B"));
    errorOf(await agent.put(`${API}/projects/order`).send({ ids: [a] }), 400, "INVALID_ORDER");
    errorOf(await agent.put(`${API}/projects/order`).send({}), 400, "VALIDATION_ERROR");
    errorOf(await request(app).put(`${API}/projects/order`).send({ ids: [] }), 401, "UNAUTHORIZED");
  });
});

describe("social links", () => {
  it("creates, updates, reorders and deletes; the public page lists them in order", async () => {
    const { agent, ident } = await registerAndLogin();
    const a = (await create(agent, "social", { platform: "github", url: "https://github.com/a" }))
      .link.id;
    const b = (
      await create(agent, "social", { platform: "linkedin", url: "https://linkedin.com/in/a" })
    ).link.id;
    await agent.patch(`${API}/social/${a}`).send({ url: "https://github.com/new" }).expect(200);
    await agent
      .put(`${API}/social/order`)
      .send({ ids: [b, a] })
      .expect(204);
    const pub = await request(app).get(`${API}/portfolio/${ident.username}`).expect(200);
    assert.deepEqual(pub.body.socialLinks, [
      { platform: "linkedin", url: "https://linkedin.com/in/a" },
      { platform: "github", url: "https://github.com/new" },
    ]);
    await agent.delete(`${API}/social/${b}`).expect(204);
    assert.equal((await agent.get(`${API}/social`).expect(200)).body.links.length, 1);
  });

  it("rejects javascript: urls, unknown platforms and more than 12 links", async () => {
    const { agent } = await registerAndLogin();
    for (const body of [
      { platform: "github", url: "javascript:alert(1)" },
      { platform: "myspace9", url: "https://x.com" },
      { platform: "github" },
    ]) {
      const res = await agent.post(`${API}/social`).send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
    for (let i = 0; i < 12; i++)
      await create(agent, "social", { platform: "website", url: `https://e${i}.dev` });
    errorOf(
      await agent.post(`${API}/social`).send({ platform: "website", url: "https://more.dev" }),
      409,
      "SOCIAL_LIMIT",
    );
  });

  it("answers 404 for another user's link and needs a login", async () => {
    const one = await registerAndLogin();
    const two = await registerAndLogin();
    const id = (
      await create(one.agent, "social", { platform: "github", url: "https://github.com/a" })
    ).link.id;
    errorOf(
      await two.agent.patch(`${API}/social/${id}`).send({ url: "https://x.dev" }),
      404,
      "SOCIAL_NOT_FOUND",
    );
    errorOf(await two.agent.delete(`${API}/social/${id}`), 404, "SOCIAL_NOT_FOUND");
    errorOf(
      await two.agent.put(`${API}/social/order`).send({ ids: [id] }),
      404,
      "SOCIAL_NOT_FOUND",
    );
    errorOf(await request(app).get(`${API}/social`), 401, "UNAUTHORIZED");
  });
});

describe("timeline", () => {
  const job = (title, extra = {}) => ({
    type: "EXPERIENCE",
    title,
    organization: "Acme",
    startDate: "2022-01-01",
    ...extra,
  });

  it("creates experience and education, filters by type and orders per type", async () => {
    const { agent, ident } = await registerAndLogin();
    const a = (await create(agent, "timeline", job("A"))).item.id;
    const b = (await create(agent, "timeline", job("B", { endDate: "2023-05-31" }))).item.id;
    const e = (await create(agent, "timeline", job("BSc", { type: "EDUCATION" }))).item.id;
    const onlyJobs = (await agent.get(`${API}/timeline?type=EXPERIENCE`).expect(200)).body.items;
    assert.deepEqual(ids(onlyJobs), [a, b]);
    assert.equal(onlyJobs[1].endDate.slice(0, 10), "2023-05-31");

    await agent
      .put(`${API}/timeline/order`)
      .send({ type: "EXPERIENCE", ids: [b, a] })
      .expect(204);
    const pub = await request(app).get(`${API}/portfolio/${ident.username}`).expect(200);
    // Grouped by type (EXPERIENCE before EDUCATION), each group in its saved order.
    assert.deepEqual(
      pub.body.timelineItems.map((t) => t.title),
      ["B", "A", "BSc"],
    );
    assert.ok(e);
  });

  it("rejects bad dates, an end before the start, and a type in the order that does not match", async () => {
    const { agent } = await registerAndLogin();
    for (const body of [
      job("X", { startDate: "2022-02-31" }),
      job("X", { startDate: "01/02/2022" }),
      job("X", { endDate: "2021-12-31" }),
      job("X", { type: "HOBBY" }),
      { type: "EXPERIENCE", title: "X" },
    ]) {
      const res = await agent.post(`${API}/timeline`).send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
    const a = (await create(agent, "timeline", job("A"))).item.id;
    errorOf(
      await agent.put(`${API}/timeline/order`).send({ type: "EDUCATION", ids: [a] }),
      404,
      "TIMELINE_NOT_FOUND",
    );
  });

  it("re-checks dates on update, and can clear the end date", async () => {
    const { agent } = await registerAndLogin();
    const id = (await create(agent, "timeline", job("A", { endDate: "2023-01-01" }))).item.id;
    const bad = await agent.patch(`${API}/timeline/${id}`).send({ startDate: "2024-01-01" });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.error.fields.endDate);
    const cleared = await agent.patch(`${API}/timeline/${id}`).send({ endDate: "" }).expect(200);
    assert.equal(cleared.body.item.endDate, null);
  });

  it("answers 404 for another user's item and needs a login", async () => {
    const one = await registerAndLogin();
    const two = await registerAndLogin();
    const id = (await create(one.agent, "timeline", job("A"))).item.id;
    errorOf(
      await two.agent.patch(`${API}/timeline/${id}`).send({ title: "x" }),
      404,
      "TIMELINE_NOT_FOUND",
    );
    errorOf(await two.agent.delete(`${API}/timeline/${id}`), 404, "TIMELINE_NOT_FOUND");
    errorOf(await request(app).get(`${API}/timeline`), 401, "UNAUTHORIZED");
  });
});

describe("profile headline and location", () => {
  it("saves, clears and exposes them publicly", async () => {
    const { agent, ident } = await registerAndLogin();
    await agent
      .patch(`${API}/profile`)
      .send({ headline: "Full-stack dev", location: "Addis Ababa" })
      .expect(200);
    const pub = await request(app).get(`${API}/portfolio/${ident.username}`).expect(200);
    assert.equal(pub.body.profile.headline, "Full-stack dev");
    const res = await agent.patch(`${API}/profile`).send({ headline: "" }).expect(200);
    assert.equal(res.body.profile.headline, null);
    assert.equal(
      (await agent.patch(`${API}/profile`).send({ headline: "x".repeat(121) })).status,
      400,
    );
  });
});
