import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  API,
  app,
  prisma,
  request,
  cleanupUsers,
  cookieHeader,
  ACCESS_COOKIE,
  errorOf,
  registerAndLogin,
} from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

const state = (agent) => agent.get(`${API}/onboarding/state`);
const put = (agent, n, body) => agent.put(`${API}/onboarding/step/${n}`).send(body);
const complete = (agent) => agent.post(`${API}/onboarding/complete`);
const basics = {
  data: { displayName: "Ada Lovelace", headline: "Engineer", contactEmail: "ada@example.com" },
};

describe("GET /onboarding/state", () => {
  it("is empty for a new user and needs a session", async () => {
    const { agent } = await registerAndLogin();
    const res = await state(agent).expect(200);
    assert.deepEqual(res.body, { step: 1, data: {}, skipped: [], complete: false });
    assert.equal((await request(app).get(`${API}/onboarding/state`)).status, 401);
  });

  it("keeps every user's progress separate", async () => {
    const one = await registerAndLogin();
    const two = await registerAndLogin();
    await put(one.agent, 1, basics).expect(200);
    assert.deepEqual((await state(two.agent)).body.data, {});
    assert.equal((await state(one.agent)).body.data["1"].displayName, "Ada Lovelace");
  });
});

describe("PUT /onboarding/step/:n", () => {
  it("saves a step, moves to the next one and returns the state", async () => {
    const { agent } = await registerAndLogin();
    const res = await put(agent, 1, basics).expect(200);
    assert.equal(res.body.step, 2);
    assert.equal(res.body.data["1"].headline, "Engineer");
    assert.deepEqual((await state(agent)).body, res.body);
  });

  it("honours `next` (going back) and lets a skipped step be filled in later", async () => {
    const { agent } = await registerAndLogin();
    await put(agent, 1, basics).expect(200);
    const skipped = await put(agent, 2, { skip: true }).expect(200);
    assert.deepEqual(skipped.body.skipped, [2]);
    assert.equal(skipped.body.data["2"], undefined);
    const back = await put(agent, 3, { data: { skills: [] }, next: 2 }).expect(200);
    assert.equal(back.body.step, 2);
    const filled = await put(agent, 2, {
      data: { aboutText: "Hello", heroRoleTexts: ["Dev"] },
    }).expect(200);
    assert.deepEqual(filled.body.skipped, []);
    assert.equal(filled.body.data["2"].aboutText, "Hello");
  });

  it("rejects a step number outside 1 to 5", async () => {
    const { agent } = await registerAndLogin();
    errorOf(await put(agent, 9, { data: {} }), 400, "INVALID_STEP");
    errorOf(await put(agent, 0, { data: {} }), 400, "INVALID_STEP");
    errorOf(await put(agent, "abc", { data: {} }), 400, "INVALID_STEP");
  });

  it("does not let the basics be skipped", async () => {
    const { agent } = await registerAndLogin();
    errorOf(await put(agent, 1, { skip: true }), 400, "STEP_REQUIRED");
  });

  it("validates each step and reports fields", async () => {
    const { agent } = await registerAndLogin();
    const noName = await put(agent, 1, { data: { displayName: "  " } });
    errorOf(noName, 400, "VALIDATION_ERROR");
    assert.ok(noName.body.error.fields.displayName);
    const dup = await put(agent, 3, {
      data: {
        skills: [
          { name: "Rust", level: "good" },
          { name: "rust", level: "good" },
        ],
      },
    });
    errorOf(dup, 400, "VALIDATION_ERROR");
    assert.ok(dup.body.error.fields["1.name"] || dup.body.error.fields["skills.1.name"]);
    const badUrl = await put(agent, 5, { data: { githubUrl: "javascript:alert(1)" } });
    errorOf(badUrl, 400, "VALIDATION_ERROR");
    assert.ok(badUrl.body.error.fields.githubUrl);
    const badLink = await put(agent, 5, {
      data: { socialLinks: [{ platform: "nope", url: "https://a.dev" }] },
    });
    errorOf(badLink, 400, "VALIDATION_ERROR");
  });

  it("rejects a missing body and a bad `next`", async () => {
    const { agent } = await registerAndLogin();
    errorOf(await put(agent, 2, {}), 400, "VALIDATION_ERROR");
    errorOf(await put(agent, 2, { data: {}, next: 9 }), 400, "VALIDATION_ERROR");
  });

  it("needs a session", async () => {
    assert.equal((await request(app).put(`${API}/onboarding/step/1`).send(basics)).status, 401);
  });

  it("is refused once onboarding is complete", async () => {
    const { agent } = await registerAndLogin();
    await put(agent, 1, basics).expect(200);
    await complete(agent).expect(200);
    errorOf(await put(agent, 2, { skip: true }), 409, "ALREADY_ONBOARDED");
  });
});

describe("POST /onboarding/complete", () => {
  it("fails without the basics and leaves the account unfinished", async () => {
    const { agent } = await registerAndLogin();
    errorOf(await complete(agent), 400, "BASICS_REQUIRED");
    assert.equal((await state(agent)).body.complete, false);
    await put(agent, 1, basics).expect(200);
    await complete(agent).expect(200);
  });

  it("writes profile, skills, projects and links, then keeps only the skipped list", async () => {
    const { agent, user } = await registerAndLogin();
    await put(agent, 1, { data: { ...basics.data, location: "London" } }).expect(200);
    await put(agent, 2, {
      data: { aboutText: "I build things", heroRoleTexts: ["Dev", "Maker"] },
    }).expect(200);
    await put(agent, 3, {
      data: {
        skills: [
          { name: "react", level: "great" },
          { name: "Figma", level: "good" },
        ],
      },
    }).expect(200);
    await put(agent, 4, {
      data: { projects: [{ title: "P1", tags: ["a"] }, { title: "P2" }] },
    }).expect(200);
    await put(agent, 5, {
      data: {
        githubUrl: "https://github.com/ada",
        socialLinks: [{ platform: "linkedin", url: "https://linkedin.com/in/ada" }],
      },
    }).expect(200);

    const done = await complete(agent).expect(200);
    assert.deepEqual(done.body, { skipped: [] });

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    assert.equal(profile.displayName, "Ada Lovelace");
    assert.equal(profile.location, "London");
    assert.equal(profile.aboutText, "I build things");
    assert.deepEqual(profile.heroRoleTexts, ["Dev", "Maker"]);
    assert.equal(profile.githubUrl, "https://github.com/ada");

    const skills = await prisma.skill.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    });
    assert.deepEqual(
      skills.map((s) => [s.name, s.isCustom, s.sortOrder]),
      [
        ["react", false, 0],
        ["Figma", true, 1],
      ],
    );
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    });
    assert.deepEqual(
      projects.map((p) => p.title),
      ["P1", "P2"],
    );
    const links = await prisma.socialLink.findMany({ where: { userId: user.id } });
    assert.deepEqual(
      links.map((l) => l.platform),
      ["linkedin"],
    );
    assert.equal(
      (await prisma.user.findUnique({ where: { id: user.id } })).onboardingComplete,
      true,
    );

    const after = (await state(agent)).body;
    assert.equal(after.complete, true);
    assert.deepEqual(after.data, {});
  });

  it("finishes with only the basics and lists the skipped steps", async () => {
    const { agent } = await registerAndLogin();
    await put(agent, 1, basics).expect(200);
    for (const n of [2, 3, 4, 5]) await put(agent, n, { skip: true }).expect(200);
    assert.deepEqual((await complete(agent).expect(200)).body, { skipped: [2, 3, 4, 5] });
    const s = (await state(agent)).body;
    assert.equal(s.complete, true);
    assert.deepEqual(s.skipped, [2, 3, 4, 5]);
  });

  it("works a second time only as a 409", async () => {
    const { agent } = await registerAndLogin();
    await put(agent, 1, basics).expect(200);
    await complete(agent).expect(200);
    errorOf(await complete(agent), 409, "ALREADY_ONBOARDED");
  });

  it("leaves out a skill that already exists and places new rows after existing ones", async () => {
    const { agent, user } = await registerAndLogin();
    await agent.post(`${API}/skills`).send({ name: "Rust", level: "good" }).expect(201);
    await put(agent, 1, basics).expect(200);
    await put(agent, 3, {
      data: {
        skills: [
          { name: "rust", level: "good" },
          { name: "Zig", level: "learning" },
        ],
      },
    }).expect(200);
    await complete(agent).expect(200);
    const skills = await prisma.skill.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
    });
    assert.deepEqual(
      skills.map((s) => s.name),
      ["Rust", "Zig"],
    );
    assert.equal(skills[1].sortOrder, 2);
  });

  it("needs a session", async () => {
    assert.equal((await request(app).post(`${API}/onboarding/complete`)).status, 401);
  });
});

describe("onboarding endpoints and bad sessions", () => {
  it("refuse a garbage access cookie on every endpoint", async () => {
    const cookie = `${ACCESS_COOKIE}=garbage`;
    errorOf(
      await request(app).get(`${API}/onboarding/state`).set("Cookie", cookie),
      401,
      "INVALID_TOKEN",
    );
    errorOf(
      await request(app).put(`${API}/onboarding/step/1`).set("Cookie", cookie).send(basics),
      401,
      "INVALID_TOKEN",
    );
    errorOf(
      await request(app).post(`${API}/onboarding/complete`).set("Cookie", cookie),
      401,
      "INVALID_TOKEN",
    );
  });

  it("refuse a session that was logged out", async () => {
    const { loginRes } = await registerAndLogin();
    const cookies = cookieHeader(loginRes);
    await request(app).post(`${API}/auth/logout`).set("Cookie", cookies).expect(204);
    errorOf(
      await request(app).get(`${API}/onboarding/state`).set("Cookie", cookies),
      401,
      "SESSION_ENDED",
    );
    errorOf(
      await request(app).post(`${API}/onboarding/complete`).set("Cookie", cookies),
      401,
      "SESSION_ENDED",
    );
  });
});

describe("POST /onboarding/complete is atomic", () => {
  it("lets exactly one of two simultaneous requests win and writes the rows once", async () => {
    const { agent, user } = await registerAndLogin();
    await put(agent, 1, basics).expect(200);
    await put(agent, 3, { data: { skills: [{ name: "react", level: "good" }] } }).expect(200);
    await put(agent, 4, { data: { projects: [{ title: "Only once" }] } }).expect(200);

    const results = await Promise.all([complete(agent), complete(agent)]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [200, 409]);
    errorOf(
      results.find((r) => r.status === 409),
      409,
      "ALREADY_ONBOARDED",
    );

    assert.equal(await prisma.skill.count({ where: { userId: user.id } }), 1);
    assert.equal(await prisma.project.count({ where: { userId: user.id } }), 1);
  });
});
