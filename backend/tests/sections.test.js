import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { API, app, prisma, request, cleanupUsers, errorOf, registerAndLogin } from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

const SECTIONS = ["about", "skills", "projects", "experience", "education", "contact"];
const patch = (agent, sectionConfig) => agent.patch(`${API}/profile`).send({ sectionConfig });
const orderOf = (config) => SECTIONS.slice().sort((a, b) => config[a].order - config[b].order);

describe("sectionConfig", () => {
  it("is complete with defaults for a new profile, on the profile and on the public page", async () => {
    const { agent, ident } = await registerAndLogin();
    const own = (await agent.get(`${API}/profile`).expect(200)).body.profile.sectionConfig;
    assert.deepEqual(orderOf(own), SECTIONS);
    assert.ok(SECTIONS.every((s) => own[s].visible === true));
    const pub = (await request(app).get(`${API}/portfolio/${ident.username}`).expect(200)).body.profile.sectionConfig;
    assert.deepEqual(pub, own);
  });

  it("hides a section and keeps the others untouched", async () => {
    const { agent, ident } = await registerAndLogin();
    const res = await patch(agent, { education: { visible: false } }).expect(200);
    assert.equal(res.body.profile.sectionConfig.education.visible, false);
    assert.equal(res.body.profile.sectionConfig.about.visible, true);
    const pub = (await request(app).get(`${API}/portfolio/${ident.username}`).expect(200)).body.profile.sectionConfig;
    assert.equal(pub.education.visible, false);
  });

  it("saves a new order (a full permutation) and returns it after reload", async () => {
    const { agent } = await registerAndLogin();
    const order = { projects: 0, skills: 1, about: 2, experience: 3, education: 4, contact: 5 };
    await patch(agent, Object.fromEntries(Object.entries(order).map(([k, v]) => [k, { order: v }]))).expect(200);
    const saved = (await agent.get(`${API}/profile`).expect(200)).body.profile.sectionConfig;
    assert.deepEqual(orderOf(saved), ["projects", "skills", "about", "experience", "education", "contact"]);
  });

  it("rejects unknown sections, wrong types, out-of-range positions and shared positions", async () => {
    const { agent } = await registerAndLogin();
    for (const body of [
      { blog: { visible: true } },
      { about: { visible: "yes" } },
      { about: { order: 9 } },
      { about: { order: 1.5 } },
      { about: { colour: "red" } },
    ]) {
      const res = await patch(agent, body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.error.code, "VALIDATION_ERROR");
    }
    // about takes skills' position without moving skills
    const clash = await patch(agent, { about: { order: 1 } });
    errorOf(clash, 400, "VALIDATION_ERROR");
    assert.ok(clash.body.error.fields.sectionConfig);
    assert.deepEqual(orderOf((await agent.get(`${API}/profile`).expect(200)).body.profile.sectionConfig), SECTIONS);
  });

  it("null resets to the defaults, and the endpoint needs a login", async () => {
    const { agent } = await registerAndLogin();
    await patch(agent, { contact: { visible: false } }).expect(200);
    const reset = await patch(agent, null).expect(200);
    assert.equal(reset.body.profile.sectionConfig.contact.visible, true);
    errorOf(await request(app).patch(`${API}/profile`).send({ sectionConfig: null }), 401, "UNAUTHORIZED");
  });

  it("an update of other profile fields leaves the saved config alone", async () => {
    const { agent } = await registerAndLogin();
    await patch(agent, { skills: { visible: false } }).expect(200);
    const res = await agent.patch(`${API}/profile`).send({ headline: "Dev" }).expect(200);
    assert.equal(res.body.profile.sectionConfig.skills.visible, false);
  });

  it("is also part of a share-link portfolio", async () => {
    const { agent } = await registerAndLogin();
    await patch(agent, { about: { visible: false } }).expect(200);
    const { shareToken } = (await agent.post(`${API}/share`).expect(200)).body;
    const pub = await request(app).get(`${API}/portfolio/share/${shareToken}`).expect(200);
    assert.equal(pub.body.profile.sectionConfig.about.visible, false);
  });
});
