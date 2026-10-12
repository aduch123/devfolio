import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { API, app, prisma, request, cleanupUsers, errorOf, registerAndLogin } from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

const add = (agent, body) => agent.post(`${API}/skills`).send(body);
const list = async (agent) => (await agent.get(`${API}/skills`).expect(200)).body.skills;

describe("POST skills", () => {
  it("adds a preset: lowercase value, derived category, not custom", async () => {
    const { agent } = await registerAndLogin();
    const res = await add(agent, { name: "JavaScript", level: "good" });
    assert.equal(res.status, 201);
    assert.equal(res.body.skill.name, "javascript");
    assert.equal(res.body.skill.category, "frontend");
    assert.equal(res.body.skill.isCustom, false);
  });

  it("adds a custom skill with its own category, and several 'custom' ones are fine", async () => {
    const { agent } = await registerAndLogin();
    const a = await add(agent, { name: "Rust", level: "learning", category: "backend" });
    assert.equal(a.status, 201);
    assert.equal(a.body.skill.name, "Rust");
    assert.equal(a.body.skill.isCustom, true);
    assert.equal(a.body.skill.category, "backend");
    const b = await add(agent, { name: "Figma", level: "good" });
    assert.equal(b.status, 201);
    assert.equal(b.body.skill.category, "other");
    assert.equal((await list(agent)).length, 2);
  });

  it("refuses the same skill in another case with 409", async () => {
    const { agent } = await registerAndLogin();
    await add(agent, { name: "Rust", level: "good" }).expect(201);
    errorOf(await add(agent, { name: "rUST", level: "good" }), 409, "SKILL_EXISTS");
  });

  it("rejects a blank name, a long name, a bad level and a bad category", async () => {
    const { agent } = await registerAndLogin();
    for (const body of [
      { name: "   ", level: "good" },
      { name: "x".repeat(41), level: "good" },
      { name: "Rust", level: "expert" },
      { name: "Rust", level: "good", category: "nope" },
    ]) {
      const res = await add(agent, body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
  });

  it("needs a login", async () => {
    errorOf(
      await request(app).post(`${API}/skills`).send({ name: "Rust", level: "good" }),
      401,
      "UNAUTHORIZED",
    );
  });
});

describe("PUT skills/order", () => {
  const seed = async (agent) => {
    const ids = [];
    for (const name of ["Rust", "Go", "Figma"]) {
      ids.push((await add(agent, { name, level: "good" }).expect(201)).body.skill.id);
    }
    return ids;
  };

  it("new skills go last, and a saved order persists for the owner and the public page", async () => {
    const { agent, ident } = await registerAndLogin();
    const [a, b, c] = await seed(agent);
    assert.deepEqual(
      (await list(agent)).map((s) => s.id),
      [a, b, c],
    );

    const res = await agent.put(`${API}/skills/order`).send({ ids: [c, a, b] });
    assert.equal(res.status, 204);
    assert.deepEqual(
      (await list(agent)).map((s) => s.id),
      [c, a, b],
    );

    const pub = await request(app).get(`${API}/portfolio/${ident.username}`).expect(200);
    assert.deepEqual(
      pub.body.skills.map((s) => s.name),
      ["Figma", "Rust", "Go"],
    );
    assert.equal(pub.body.skills[0].isCustom, true);
  });

  it("a skill added after reordering is placed last", async () => {
    const { agent } = await registerAndLogin();
    const [a, b, c] = await seed(agent);
    await agent
      .put(`${API}/skills/order`)
      .send({ ids: [c, b, a] })
      .expect(204);
    const d = (await add(agent, { name: "Sketch", level: "good" }).expect(201)).body.skill.id;
    assert.deepEqual(
      (await list(agent)).map((s) => s.id),
      [c, b, a, d],
    );
  });

  it("answers 404 for another user's skill id and changes nothing", async () => {
    const one = await registerAndLogin();
    const two = await registerAndLogin();
    const mine = await seed(one.agent);
    const theirs = (await add(two.agent, { name: "Rust", level: "good" }).expect(201)).body.skill
      .id;
    errorOf(
      await one.agent.put(`${API}/skills/order`).send({ ids: [mine[2], mine[1], theirs] }),
      404,
      "SKILL_NOT_FOUND",
    );
    assert.deepEqual(
      (await list(one.agent)).map((s) => s.id),
      mine,
    );
  });

  it("rejects a duplicated id and an incomplete list with 400", async () => {
    const { agent } = await registerAndLogin();
    const [a, b] = await seed(agent);
    errorOf(await agent.put(`${API}/skills/order`).send({ ids: [a, a, b] }), 400, "INVALID_ORDER");
    errorOf(await agent.put(`${API}/skills/order`).send({ ids: [a, b] }), 400, "INVALID_ORDER");
  });

  it("rejects a body without ids and needs a login", async () => {
    const { agent } = await registerAndLogin();
    errorOf(await agent.put(`${API}/skills/order`).send({}), 400, "VALIDATION_ERROR");
    errorOf(await request(app).put(`${API}/skills/order`).send({ ids: [] }), 401, "UNAUTHORIZED");
  });
});

describe("PATCH and DELETE skills/:id", () => {
  it("does not let another user edit or delete a skill (404)", async () => {
    const one = await registerAndLogin();
    const two = await registerAndLogin();
    const id = (await add(one.agent, { name: "Rust", level: "good" }).expect(201)).body.skill.id;
    errorOf(
      await two.agent.patch(`${API}/skills/${id}`).send({ level: "great" }),
      404,
      "SKILL_NOT_FOUND",
    );
    errorOf(await two.agent.delete(`${API}/skills/${id}`), 404, "SKILL_NOT_FOUND");
    assert.equal((await list(one.agent))[0].level, "good");
  });

  it("renaming to a preset clears isCustom, renaming to a custom name sets it", async () => {
    const { agent } = await registerAndLogin();
    const id = (await add(agent, { name: "Rust", level: "good" }).expect(201)).body.skill.id;
    const toPreset = await agent.patch(`${API}/skills/${id}`).send({ name: "Python" }).expect(200);
    assert.equal(toPreset.body.skill.isCustom, false);
    assert.equal(toPreset.body.skill.category, "backend");
    const toCustom = await agent.patch(`${API}/skills/${id}`).send({ name: "Zig" }).expect(200);
    assert.equal(toCustom.body.skill.isCustom, true);
  });
});

describe("Wizard onboarding with skills", () => {
  const put = (agent, n, data) => agent.put(`${API}/onboarding/step/${n}`).send({ data });

  it("rejects case-insensitive duplicates, then stores skill order, preset and custom skills", async () => {
    const dup = await registerAndLogin();
    const bad = await put(dup.agent, 3, {
      skills: [
        { name: "Rust", level: "good" },
        { name: "rust", level: "good" },
      ],
    });
    assert.equal(bad.status, 400);

    const { agent } = await registerAndLogin();
    await put(agent, 1, { displayName: "A" }).expect(200);
    await put(agent, 3, {
      skills: [
        { name: "react", level: "great" },
        { name: "Figma", level: "good" },
      ],
    }).expect(200);
    await put(agent, 4, { projects: [{ title: "P1" }, { title: "P2" }] }).expect(200);
    await agent.post(`${API}/onboarding/complete`).expect(200);

    const skills = await list(agent);
    assert.deepEqual(
      skills.map((s) => [s.name, s.isCustom, s.sortOrder]),
      [
        ["react", false, 0],
        ["Figma", true, 1],
      ],
    );
    const projects = await prisma.project.findMany({
      where: { user: { id: skills[0].userId } },
      orderBy: { sortOrder: "asc" },
    });
    assert.deepEqual(
      projects.map((p) => [p.title, p.sortOrder]),
      [
        ["P1", 0],
        ["P2", 1],
      ],
    );
  });
});
