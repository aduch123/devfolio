import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import { API, app, prisma, request, cleanupUsers, errorOf, registerAndLogin } from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

it("protects drafts while allowing the authenticated owner to preview", async () => {
  const { agent, ident } = await registerAndLogin();
  errorOf(await request(app).get(`${API}/portfolio/${ident.username}`), 404, "USER_NOT_FOUND");
  errorOf(await request(app).get(`${API}/portfolio/me`), 401, "UNAUTHORIZED");
  const own = await agent.get(`${API}/portfolio/me`).expect(200);
  assert.equal(own.body.username, ident.username);
  assert.equal(own.body.email, undefined);
  assert.equal(own.body.id, undefined);
});

it("requires verification and complete content, then supports publish and unpublish", async () => {
  const { agent, ident } = await registerAndLogin();
  errorOf(await agent.post(`${API}/profile/publish`), 403, "EMAIL_NOT_VERIFIED");
  await prisma.user.update({
    where: { email: ident.email },
    data: { emailVerifiedAt: new Date() },
  });
  errorOf(await agent.post(`${API}/profile/publish`), 400, "INCOMPLETE_PROFILE");
  await agent
    .patch(`${API}/profile`)
    .send({ displayName: "Developer", aboutText: "I build useful tools." })
    .expect(200);
  const published = await agent.post(`${API}/profile/publish`).expect(200);
  assert.equal(published.body.profile.published, true);
  assert.ok(published.body.profile.publishedAt);
  await request(app).get(`${API}/portfolio/${ident.username}`).expect(200);
  await prisma.user.update({ where: { email: ident.email }, data: { emailVerifiedAt: null } });
  await agent.post(`${API}/profile/unpublish`).expect(200);
  await request(app).get(`${API}/portfolio/${ident.username}`).expect(404);
  await agent.get(`${API}/portfolio/me`).expect(200);
});

it("keeps draft share links available and denies unauthenticated publishing", async () => {
  const { agent } = await registerAndLogin();
  const { shareToken } = (await agent.post(`${API}/share`).expect(200)).body;
  await request(app).get(`${API}/portfolio/share/${shareToken}`).expect(200);
  for (const action of ["publish", "unpublish"]) {
    errorOf(await request(app).post(`${API}/profile/${action}`), 401, "UNAUTHORIZED");
  }
});
