import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import { API, app, prisma, request, cleanupUsers, registerAndLogin } from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

it("renders published content and SEO in source and protects drafts", async () => {
  const { agent, ident } = await registerAndLogin();
  const draft = await request(app).get(`/${ident.username}`).expect(404);
  assert.match(draft.headers["x-robots-tag"], /noindex/);
  await agent
    .patch(`${API}/profile`)
    .send({
      displayName: "A <Developer>",
      aboutText: "I build useful apps.",
      headline: "Software engineer",
      seoTitle: "My custom title",
      seoDescription: "My custom description",
    })
    .expect(200);
  await prisma.profile.update({
    where: { userId: (await prisma.user.findUnique({ where: { username: ident.username } })).id },
    data: { published: true },
  });
  const page = await request(app).get(`/${ident.username}`).expect(200);
  assert.match(page.text, /<title id="page-title">My custom title<\/title>/);
  assert.match(page.text, /A &lt;Developer&gt;/);
  assert.match(page.text, /I build useful apps\./);
  assert.match(page.text, /property="og:title" content="My custom title"/);
  assert.match(page.text, /application\/ld\+json/);
  assert.match(page.text, /rel="canonical"/);
  assert.doesNotMatch(page.text, /passwordHash|shareToken|"userId"/);
  assert.match(
    (await request(app).get("/sitemap.xml").expect(200)).text,
    new RegExp(ident.username),
  );
  const image = await request(app).get(`/${ident.username}/og.png`).expect(200);
  assert.match(image.headers["content-type"], /image\/png/);
  await agent.post(`${API}/profile/unpublish`).expect(200);
  await request(app).get(`/${ident.username}`).expect(404);
  await request(app).get(`/${ident.username}/og.png`).expect(404);
  assert.doesNotMatch((await request(app).get("/sitemap.xml")).text, new RegExp(ident.username));
});
it("escapes script-breaking metadata and returns robots instructions", async () => {
  const { agent, ident } = await registerAndLogin();
  await agent
    .patch(`${API}/profile`)
    .send({ displayName: "</script><script>alert(1)</script>", aboutText: "Safe content" })
    .expect(200);
  await prisma.profile.update({
    where: { userId: (await prisma.user.findUnique({ where: { username: ident.username } })).id },
    data: { published: true },
  });
  const page = await request(app).get(`/${ident.username}`).expect(200);
  assert.doesNotMatch(page.text, /<script>alert\(1\)<\/script>/);
  assert.match(page.text, /\\u003c\/script/);
  assert.match((await request(app).get("/robots.txt").expect(200)).text, /Disallow: \/share\//);
});
