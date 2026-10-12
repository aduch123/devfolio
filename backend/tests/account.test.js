import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  API,
  app,
  prisma,
  request,
  PASSWORD,
  cleanupUsers,
  clearMail,
  errorOf,
  expectNoMail,
  loginWith,
  newIdentity,
  registerAndLogin,
  waitForMail,
} from "./helpers.js";
import { runCleanup } from "../jobs/cleanup.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

const acct = (agent, path, body) => agent.post(`${API}/account/${path}`).send(body);
const NEW_PASSWORD = "Brand-new-pass-2";

describe("POST account/password", () => {
  it("changes the password, keeps this session and ends the others", async () => {
    const { agent, ident } = await registerAndLogin();
    const other = request.agent(app);
    await loginWith(ident, other).expect(200);
    const res = await acct(agent, "password", {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    assert.equal(res.status, 204);
    await agent.get(`${API}/auth/me`).expect(200);
    errorOf(await other.get(`${API}/auth/me`), 401, "SESSION_ENDED");
    errorOf(await loginWith(ident), 401, "INVALID_CREDENTIALS");
    await loginWith({ ...ident, password: NEW_PASSWORD }).expect(200);
  });

  it("needs a login", async () => {
    const res = await request(app)
      .post(`${API}/account/password`)
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
    errorOf(res, 401, "UNAUTHORIZED");
  });

  it("refuses a wrong current password with 403", async () => {
    const { agent } = await registerAndLogin();
    errorOf(
      await acct(agent, "password", {
        currentPassword: "Wrong-password-9",
        newPassword: NEW_PASSWORD,
      }),
      403,
      "WRONG_PASSWORD",
    );
  });

  it("refuses an unchanged or too short new password", async () => {
    const { agent } = await registerAndLogin();
    errorOf(
      await acct(agent, "password", { currentPassword: PASSWORD, newPassword: PASSWORD }),
      400,
      "SAME_PASSWORD",
    );
    const res = await acct(agent, "password", { currentPassword: PASSWORD, newPassword: "short" });
    errorOf(res, 400, "VALIDATION_ERROR");
    assert.ok(res.body.error.fields.newPassword);
  });
});

describe("POST account/email", () => {
  it("changes the email, marks it unverified and sends a verification link to the new address", async () => {
    const { agent } = await registerAndLogin();
    const newEmail = newIdentity().email;
    clearMail();
    const res = await acct(agent, "email", { password: PASSWORD, email: newEmail.toUpperCase() });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, newEmail);
    assert.equal(res.body.user.emailVerified, false);
    await waitForMail(newEmail, "Verify");
    const me = await agent.get(`${API}/auth/me`).expect(200);
    assert.equal(me.body.user.email, newEmail);
  });

  it("refuses an email that is taken", async () => {
    const { agent } = await registerAndLogin();
    const { ident: other } = await registerAndLogin();
    errorOf(
      await acct(agent, "email", { password: PASSWORD, email: other.email }),
      409,
      "EMAIL_EXISTS",
    );
  });

  it("refuses a wrong password, the same email and an invalid email", async () => {
    const { agent, ident } = await registerAndLogin();
    errorOf(
      await acct(agent, "email", { password: "Wrong-password-9", email: newIdentity().email }),
      403,
      "WRONG_PASSWORD",
    );
    errorOf(
      await acct(agent, "email", { password: PASSWORD, email: ident.email }),
      400,
      "SAME_EMAIL",
    );
    errorOf(
      await acct(agent, "email", { password: PASSWORD, email: "nope" }),
      400,
      "VALIDATION_ERROR",
    );
  });

  it("needs a login", async () => {
    errorOf(
      await request(app)
        .post(`${API}/account/email`)
        .send({ password: PASSWORD, email: newIdentity().email }),
      401,
      "UNAUTHORIZED",
    );
  });
});

describe("POST account/username", () => {
  it("renames the user; the old public URL is 404 and the new one works", async () => {
    const { agent, ident } = await registerAndLogin();
    const username = `n-${ident.username}`.slice(0, 30);
    const res = await acct(agent, "username", { username: username.toUpperCase() });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, username);
    errorOf(await request(app).get(`${API}/portfolio/${ident.username}`), 404, "USER_NOT_FOUND");
    await request(app).get(`${API}/portfolio/${username}`).expect(200);
    const me = await agent.get(`${API}/auth/me`).expect(200);
    assert.equal(me.body.user.username, username);
  });

  it("refuses reserved, taken and malformed names", async () => {
    const { agent } = await registerAndLogin();
    const { ident: other } = await registerAndLogin();
    const reserved = await acct(agent, "username", { username: "edit" });
    errorOf(reserved, 400, "VALIDATION_ERROR");
    assert.ok(reserved.body.error.fields.username);
    errorOf(await acct(agent, "username", { username: other.username }), 409, "USERNAME_EXISTS");
    errorOf(await acct(agent, "username", { username: "-bad-" }), 400, "VALIDATION_ERROR");
  });

  it("needs a login", async () => {
    errorOf(
      await request(app).post(`${API}/account/username`).send({ username: "someone-else" }),
      401,
      "UNAUTHORIZED",
    );
  });
});

describe("POST account/delete", () => {
  it("hides the account and ends every session at once", async () => {
    const { agent, ident } = await registerAndLogin();
    const other = request.agent(app);
    await loginWith(ident, other).expect(200);
    const res = await acct(agent, "delete", { password: PASSWORD });
    assert.equal(res.status, 204);
    errorOf(await agent.get(`${API}/auth/me`), 401, "UNAUTHORIZED");
    errorOf(await other.get(`${API}/auth/me`), 401, "SESSION_ENDED");
    errorOf(await loginWith(ident), 401, "INVALID_CREDENTIALS");
    errorOf(await request(app).get(`${API}/portfolio/${ident.username}`), 404, "USER_NOT_FOUND");
    const row = await prisma.user.findUnique({ where: { email: ident.email } });
    assert.ok(row.deletedAt);
    clearMail();
    await request(app).post(`${API}/auth/forgot-password`).send({ email: ident.email }).expect(202);
    await expectNoMail(ident.email, "Reset");
  });

  it("refuses a wrong password and needs a login", async () => {
    const { agent, ident } = await registerAndLogin();
    errorOf(await acct(agent, "delete", { password: "Wrong-password-9" }), 403, "WRONG_PASSWORD");
    errorOf(await acct(agent, "delete", {}), 400, "VALIDATION_ERROR");
    errorOf(
      await request(app).post(`${API}/account/delete`).send({ password: PASSWORD }),
      401,
      "UNAUTHORIZED",
    );
    await loginWith(ident).expect(200);
  });
});

describe("cleanup job", () => {
  it("removes accounts after the grace window, expired sessions and old email tokens", async () => {
    const old = await registerAndLogin();
    const recent = await registerAndLogin();
    const live = await registerAndLogin();
    const day = 24 * 60 * 60 * 1000;
    await acct(old.agent, "delete", { password: PASSWORD }).expect(204);
    await acct(recent.agent, "delete", { password: PASSWORD }).expect(204);
    await prisma.user.update({
      where: { email: old.ident.email },
      data: { deletedAt: new Date(Date.now() - 15 * day) },
    });
    await prisma.user.update({
      where: { email: recent.ident.email },
      data: { deletedAt: new Date(Date.now() - 13 * day) },
    });

    const liveUser = await prisma.user.findUnique({ where: { email: live.ident.email } });
    const expired = await prisma.session.create({
      data: {
        userId: liveUser.id,
        refreshHash: "e".repeat(64),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const staleToken = await prisma.emailToken.create({
      data: {
        userId: liveUser.id,
        type: "PASSWORD_RESET",
        tokenHash: "f".repeat(64),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const result = await runCleanup();
    assert.ok(result.accounts >= 1);
    assert.equal(await prisma.user.findUnique({ where: { email: old.ident.email } }), null);
    assert.ok(await prisma.user.findUnique({ where: { email: recent.ident.email } }));
    assert.ok(await prisma.user.findUnique({ where: { email: live.ident.email } }));
    assert.equal(await prisma.session.findUnique({ where: { id: expired.id } }), null);
    assert.equal(await prisma.emailToken.findUnique({ where: { id: staleToken.id } }), null);
    await live.agent.get(`${API}/auth/me`).expect(200);
  });
});
