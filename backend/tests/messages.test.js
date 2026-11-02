import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import {
  API,
  app,
  prisma,
  request,
  cleanupUsers,
  registerAndLogin,
  testOutbox,
} from "./helpers.js";
import { testDelivery } from "../utils/mailer.js";
import { env } from "../config/env.js";
before(cleanupUsers);
after(async () => {
  testDelivery.failure = null;
  await cleanupUsers();
  await prisma.$disconnect();
});
const payload = (overrides = {}) => ({
  name: "Visitor",
  email: "visitor@example.com",
  message: "Hello from a visitor",
  startedAt: Date.now() - 3000,
  website: "",
  ...overrides,
});
async function fixture() {
  const account = await registerAndLogin();
  const user = await prisma.user.findUnique({ where: { username: account.ident.username } });
  await prisma.profile.update({ where: { userId: user.id }, data: { published: true } });
  return { ...account, user };
}
it("stores messages, sends notifications and provides owner-only inbox controls", async () => {
  const { agent, ident } = await fixture();
  const { agent: other } = await registerAndLogin();
  await request(app)
    .post(`${API}/portfolio/${ident.username}/message`)
    .send(payload({ message: "<script>plain text</script>" }))
    .expect(201);
  const inbox = (await agent.get(`${API}/messages`).expect(200)).body;
  assert.equal(inbox.unread, 1);
  assert.equal(inbox.messages[0].body, "<script>plain text</script>");
  assert.equal(inbox.messages[0].notificationState, "SENT");
  assert.ok(
    testOutbox.some(
      (mail) => mail.subject.includes("New message") && mail.text.includes("/dashboard/messages"),
    ),
  );
  const path = `${API}/messages/${inbox.messages[0].id}`;
  await other.patch(path).send({ status: "READ" }).expect(404);
  await other.delete(path).expect(404);
  assert.equal((await other.get(`${API}/messages`)).body.total, 0);
  for (const status of ["READ", "UNREAD", "ARCHIVED"]) {
    await agent.patch(path).send({ status }).expect(204);
    const state = (await agent.get(`${API}/messages?status=${status}`)).body;
    assert.equal(state.messages[0].status, status);
    assert.equal(state.unread, status === "UNREAD" ? 1 : 0);
  }
  await agent.delete(path).expect(204);
  assert.equal((await agent.get(`${API}/messages`)).body.total, 0);
  await request(app).get(`${API}/messages`).expect(401);
});
it("keeps messages when notification delivery fails and supports notification opt-out", async () => {
  const { agent, ident } = await fixture();
  testDelivery.failure = new Error("Simulated provider outage");
  try {
    await request(app)
      .post(`${API}/portfolio/${ident.username}/message`)
      .send(payload())
      .expect(201);
  } finally {
    testDelivery.failure = null;
  }
  assert.equal((await agent.get(`${API}/messages`)).body.messages[0].notificationState, "FAILED");
  await agent.patch(`${API}/messages/preferences`).send({ emailNotifications: false }).expect(200);
  const sent = testOutbox.length;
  await request(app).post(`${API}/portfolio/${ident.username}/message`).send(payload()).expect(201);
  assert.equal(testOutbox.length, sent);
  const inbox = (await agent.get(`${API}/messages`)).body;
  assert.equal(inbox.total, 2);
  assert.equal(inbox.messages[0].notificationState, "SKIPPED");
  assert.equal((await agent.get(`${API}/messages/preferences`)).body.emailNotifications, false);
});
it("rejects spam and public draft messages but accepts an active private draft link", async () => {
  const { agent, ident } = await registerAndLogin();
  for (const invalid of [
    { website: "spam" },
    { startedAt: Date.now() },
    { startedAt: 0 },
    { message: "x".repeat(2001) },
  ])
    await request(app)
      .post(`${API}/portfolio/${ident.username}/message`)
      .send(payload(invalid))
      .expect(400);
  assert.equal((await agent.get(`${API}/messages`)).body.total, 0);
  await request(app).post(`${API}/portfolio/${ident.username}/message`).send(payload()).expect(404);
  const link = (await agent.post(`${API}/share-links`).send({ label: "Private" })).body;
  await request(app)
    .post(`${API}/portfolio/share/${link.token}/message`)
    .send(payload())
    .expect(201);
  await agent.delete(`${API}/share-links/${link.shareLink.id}`).expect(204);
  await request(app)
    .post(`${API}/portfolio/share/${link.token}/message`)
    .send(payload())
    .expect(404);
});
it("paginates and searches only the owner's messages", async () => {
  const { agent, user } = await fixture();
  await prisma.message.createMany({
    data: Array.from({ length: 23 }, (_, i) => ({
      userId: user.id,
      senderName: `Visitor ${i}`,
      senderEmail: "visitor@example.com",
      body: i === 22 ? "needle unique" : "regular message",
    })),
  });
  assert.equal((await agent.get(`${API}/messages`)).body.messages.length, 20);
  assert.equal((await agent.get(`${API}/messages?page=2`)).body.messages.length, 3);
  assert.equal((await agent.get(`${API}/messages?q=needle`)).body.total, 1);
  await agent.get(`${API}/messages?page=0`).expect(400);
  await agent.get(`${API}/messages?status=INVALID`).expect(400);
});
it("rate limits repeated contact submissions without sending email", async () => {
  const { ident } = await registerAndLogin();
  const previous = env.NODE_ENV;
  env.NODE_ENV = "development";
  try {
    for (let i = 0; i < 5; i++)
      await request(app)
        .post(`${API}/portfolio/${ident.username}/message`)
        .send(payload({ website: "spam" }))
        .expect(400);
    const response = await request(app)
      .post(`${API}/portfolio/${ident.username}/message`)
      .send(payload({ website: "spam" }))
      .expect(429);
    assert.equal(response.body.error.code, "RATE_LIMITED");
  } finally {
    env.NODE_ENV = previous;
  }
});
