import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import { API, app, prisma, request, cleanupUsers, registerAndLogin } from "./helpers.js";
import { accentTokens, contrast, THEMES } from "../../frontend/js/theme.js";
before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});
it("keeps accent text and link colors above AA contrast across the color cube", () => {
  for (const red of [0, 51, 102, 153, 204, 255])
    for (const green of [0, 51, 102, 153, 204, 255])
      for (const blue of [0, 51, 102, 153, 204, 255]) {
        const color =
          "#" + [red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("");
        const tokens = accentTokens(color);
        assert.ok(contrast(tokens["--accent"], tokens["--on-accent"]) >= 4.5, color);
        for (const surface of ["#fafaf9", "#ffffff"])
          assert.ok(contrast(tokens["--accent-ink-light"], surface) >= 4.5, color);
        for (const surface of ["#111827", "#1f2937"])
          assert.ok(contrast(tokens["--accent-ink-dark"], surface) >= 4.5, color);
      }
  assert.equal(accentTokens("bad")["--accent"], "#4c5fff");
});
it("persists every template/mode and escapes appearance attributes in public HTML", async () => {
  const { agent, ident } = await registerAndLogin();
  await prisma.profile.update({
    where: { userId: (await prisma.user.findUnique({ where: { username: ident.username } })).id },
    data: { published: true },
  });
  for (const theme of THEMES) {
    await agent
      .patch(`${API}/profile`)
      .send({ theme, accentColor: "#FFDD00", colorMode: "dark" })
      .expect(200);
    const page = await request(app).get(`/${ident.username}`).expect(200);
    assert.match(page.text, new RegExp(`data-template="${theme}"`));
    assert.match(page.text, /data-color-mode="dark"/);
    assert.match(page.text, /--accent:#ffdd00/);
  }
  const own = (await agent.get(`${API}/profile`)).body.profile;
  assert.equal(own.accentColor, "#ffdd00");
  assert.equal(own.colorMode, "dark");
  for (const bad of [
    { theme: "invalid" },
    { colorMode: "unknown" },
    { accentColor: "red; background:url(https://bad.example)" },
  ])
    await agent.patch(`${API}/profile`).send(bad).expect(400);
});
it("serves marketing, a server-rendered sample, legal pages and demo preview image", async () => {
  const landing = await request(app).get("/").expect(200);
  assert.match(landing.text, /Your work\./);
  assert.match(landing.text, /<iframe\s+src="\/demo"/);
  const demo = await request(app).get("/demo").expect(200);
  assert.match(demo.text, /Alex Example/);
  assert.match(demo.text, /Atlas/);
  assert.match(demo.headers["x-robots-tag"], /noindex/);
  await request(app).get("/demo/og.png").expect(200);
  await request(app).get("/terms").expect(200);
  await request(app).get("/privacy").expect(200);
});
