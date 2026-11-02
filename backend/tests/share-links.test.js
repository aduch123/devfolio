import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { API, app, prisma, request, cleanupUsers, errorOf, registerAndLogin } from "./helpers.js";
import { hashShareToken } from "../modules/share/share.controller.js";
before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});
it("creates multiple hashed links, exposes tokens once, and renders drafts privately", async () => {
  const { agent, ident } = await registerAndLogin();
  const first = (await agent.post(`${API}/share-links`).send({ label: "Recruiter" }).expect(201))
    .body;
  const second = (await agent.post(`${API}/share-links`).send({ label: "Friend" }).expect(201))
    .body;
  assert.notEqual(first.token, second.token);
  const stored = await prisma.shareLink.findUnique({ where: { id: first.shareLink.id } });
  assert.equal(stored.tokenHash, hashShareToken(first.token));
  assert.notEqual(stored.tokenHash, first.token);
  const listed = (await agent.get(`${API}/share-links`).expect(200)).body;
  assert.equal(listed.shareLinks.length, 2);
  assert.doesNotMatch(JSON.stringify(listed), new RegExp(`${first.token}|tokenHash`));
  assert.equal((await agent.get(`${API}/share`).expect(200)).body.shareToken, null);
  const page = await request(app).get(`/share/${first.token}`).expect(200);
  assert.match(page.headers["x-robots-tag"], /noindex/);
  assert.match(page.text, /noindex,nofollow/);
  await request(app).get(`/${ident.username}`).expect(404);
  await request(app).get(`${API}/portfolio/share/${first.token}`).expect(200);
  const qr = (await agent.get(`${API}/share-links/qr`).expect(200)).body;
  assert.match(qr.dataUrl, /^data:image\/png;base64,/);
});
it("enforces ownership, validates expiry and supports editing and revocation", async () => {
  const { agent } = await registerAndLogin();
  const { agent: other } = await registerAndLogin();
  const created = (
    await agent
      .post(`${API}/share-links`)
      .send({ label: "Original", expiresAt: new Date(Date.now() + 86400000).toISOString() })
      .expect(201)
  ).body;
  const path = `${API}/share-links/${created.shareLink.id}`;
  await other.patch(path).send({ label: "Stolen" }).expect(404);
  await other.delete(path).expect(404);
  await agent.patch(path).send({ label: "Updated", expiresAt: null }).expect(200);
  assert.equal((await agent.get(`${API}/share-links`)).body.shareLinks[0].label, "Updated");
  await agent.post(`${API}/share-links`).send({ label: "", expiresAt: "invalid" }).expect(400);
  await agent
    .post(`${API}/share-links`)
    .send({ label: "Old", expiresAt: "2000-01-01T00:00:00Z" })
    .expect(400);
  await agent.delete(path).expect(204);
  errorOf(
    await request(app).get(`${API}/portfolio/share/${created.token}`),
    404,
    "SHARE_LINK_NOT_FOUND",
  );
  const unavailable = await request(app).get(`/share/${created.token}`).expect(404);
  assert.match(unavailable.headers["x-robots-tag"], /noindex/);
  await agent.patch(path).send({ label: "Revive" }).expect(404);
});
it("rejects expired, malformed and deleted-account links", async () => {
  const { agent, ident } = await registerAndLogin();
  const created = (await agent.post(`${API}/share-links`).send({ label: "Soon" }).expect(201)).body;
  await prisma.shareLink.update({
    where: { id: created.shareLink.id },
    data: { expiresAt: new Date(0) },
  });
  await request(app).get(`/share/${created.token}`).expect(404);
  await request(app).get(`${API}/portfolio/share/not-a-token`).expect(404);
  await prisma.shareLink.update({ where: { id: created.shareLink.id }, data: { expiresAt: null } });
  await prisma.user.update({
    where: { username: ident.username },
    data: { deletedAt: new Date() },
  });
  await request(app).get(`/share/${created.token}`).expect(404);
  await request(app).get(`${API}/share-links`).expect(401);
});
it("backfills legacy tokens without changing their hash or retaining plaintext", async () => {
  const schema = `share_test_${crypto.randomBytes(8).toString("hex")}`;
  const migration = fs.readFileSync(
    new URL(
      "../prisma/migrations/20261102190000_private_share_links/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const token = "a".repeat(32);
  const rollback = new Error("rollback fixture schema");
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "shareToken" TEXT)');
      await tx.$executeRaw`INSERT INTO "User" ("id", "shareToken") VALUES ('legacy-user', ${token})`;
      for (const statement of migration
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean))
        await tx.$executeRawUnsafe(statement);
      const [link] = await tx.$queryRaw`SELECT * FROM "ShareLink"`;
      assert.equal(link.tokenHash, hashShareToken(token));
      assert.equal(link.userId, "legacy-user");
      const columns =
        await tx.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'User'`;
      assert.ok(!columns.some((column) => column.column_name === "shareToken"));
      throw rollback;
    }),
    (error) => error === rollback,
  );
});
