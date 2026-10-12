import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  API,
  app,
  prisma,
  request,
  testOutbox,
  PASSWORD,
  cleanupUsers,
  clearMail,
  emailTokenRow,
  errorOf,
  expectNoMail,
  loginWith,
  newIdentity,
  registerAndLogin,
  signup,
  tokenFromMail,
  waitForMail,
} from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

const post = (path, body) => request(app).post(`${API}/auth/${path}`).send(body);
const randomToken = () => "x".repeat(10) + Date.now().toString(36) + "y".repeat(30);
const expire = (email, type) =>
  prisma.emailToken.updateMany({
    where: { type, user: { email } },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
const backdate = (email, type) =>
  prisma.emailToken.updateMany({
    where: { type, user: { email } },
    data: { createdAt: new Date(Date.now() - 5 * 60 * 1000) },
  });

async function signedUp() {
  const ident = newIdentity();
  await signup(ident).expect(201);
  const mail = await waitForMail(ident.email, "Verify");
  return { ident, token: tokenFromMail(mail) };
}

describe("POST auth/verify-email", () => {
  it("verifies the email once", async () => {
    const { ident, token } = await signedUp();
    const res = await post("verify-email", { token });
    assert.equal(res.status, 200);
    assert.equal(res.body.verified, true);
    const row = await prisma.user.findUnique({ where: { email: ident.email } });
    assert.ok(row.emailVerifiedAt);
    const login = await loginWith(ident).expect(200);
    assert.equal(login.body.user.emailVerified, true);
    const stored = await emailTokenRow(ident.email, "VERIFY_EMAIL");
    assert.equal(stored.tokenHash.length, 64);
    assert.notEqual(stored.tokenHash, token);
  });

  it("rejects a link that was already used", async () => {
    const { token } = await signedUp();
    await post("verify-email", { token }).expect(200);
    errorOf(await post("verify-email", { token }), 400, "TOKEN_USED");
  });

  it("rejects an expired link", async () => {
    const { ident, token } = await signedUp();
    await expire(ident.email, "VERIFY_EMAIL");
    errorOf(await post("verify-email", { token }), 400, "TOKEN_EXPIRED");
  });

  it("rejects an unknown token, a too-short token and a password-reset token", async () => {
    errorOf(await post("verify-email", { token: randomToken() }), 400, "TOKEN_INVALID");
    errorOf(await post("verify-email", { token: "short" }), 400, "VALIDATION_ERROR");
    const { ident } = await signedUp();
    clearMail();
    await post("forgot-password", { email: ident.email }).expect(202);
    const resetToken = tokenFromMail(await waitForMail(ident.email, "Reset"));
    errorOf(await post("verify-email", { token: resetToken }), 400, "TOKEN_INVALID");
  });
});

describe("POST auth/resend-verification", () => {
  it("sends a new link and kills the old one", async () => {
    const { ident, token } = await signedUp();
    await backdate(ident.email, "VERIFY_EMAIL");
    clearMail();
    const res = await post("resend-verification", { email: ident.email });
    assert.equal(res.status, 202);
    const fresh = tokenFromMail(await waitForMail(ident.email, "Verify"));
    assert.notEqual(fresh, token);
    errorOf(await post("verify-email", { token }), 400, "TOKEN_INVALID");
    await post("verify-email", { token: fresh }).expect(200);
  });

  it("answers the same for an unknown email and sends nothing", async () => {
    const { ident } = await signedUp();
    await backdate(ident.email, "VERIFY_EMAIL");
    const real = await post("resend-verification", { email: ident.email });
    const unknownEmail = newIdentity().email;
    const unknown = await post("resend-verification", { email: unknownEmail });
    assert.equal(unknown.status, 202);
    assert.deepEqual(unknown.body, real.body);
    await expectNoMail(unknownEmail, "Verify");
  });

  it("sends nothing for an already verified account", async () => {
    const { ident, token } = await signedUp();
    await post("verify-email", { token }).expect(200);
    clearMail();
    await post("resend-verification", { email: ident.email }).expect(202);
    await expectNoMail(ident.email, "Verify");
  });

  it("waits out the cooldown and rejects a bad email", async () => {
    const { ident } = await signedUp();
    clearMail();
    await post("resend-verification", { email: ident.email }).expect(202);
    await expectNoMail(ident.email, "Verify");
    errorOf(await post("resend-verification", { email: "nope" }), 400, "VALIDATION_ERROR");
  });
});

describe("POST auth/forgot-password", () => {
  it("emails a reset link for a real account", async () => {
    const { ident } = await signedUp();
    clearMail();
    const res = await post("forgot-password", { email: ident.email });
    assert.equal(res.status, 202);
    const mail = await waitForMail(ident.email, "Reset");
    assert.match(mail.text, /\/reset-password\?token=/);
  });

  it("answers identically for an unknown email and sends nothing", async () => {
    const { ident } = await signedUp();
    const real = await post("forgot-password", { email: ident.email });
    const unknownEmail = newIdentity().email;
    const unknown = await post("forgot-password", { email: unknownEmail });
    assert.equal(unknown.status, real.status);
    assert.deepEqual(unknown.body, real.body);
    await expectNoMail(unknownEmail, "Reset");
  });

  it("sends only one email inside the cooldown", async () => {
    const { ident } = await signedUp();
    clearMail();
    await post("forgot-password", { email: ident.email }).expect(202);
    await waitForMail(ident.email, "Reset");
    await post("forgot-password", { email: ident.email }).expect(202);
    await new Promise((r) => setTimeout(r, 400));
    assert.equal(
      testOutbox.filter((m) => m.to === ident.email && m.subject.includes("Reset")).length,
      1,
    );
  });

  it("rejects an invalid email", async () => {
    const res = await post("forgot-password", { email: "nope" });
    errorOf(res, 400, "VALIDATION_ERROR");
    assert.ok(res.body.error.fields.email);
  });
});

describe("POST auth/reset-password", () => {
  async function requestReset(ident) {
    clearMail();
    await post("forgot-password", { email: ident.email }).expect(202);
    return tokenFromMail(await waitForMail(ident.email, "Reset"));
  }

  it("sets the new password and logs every other session out", async () => {
    const { agent, ident } = await registerAndLogin();
    const second = request.agent(app);
    await loginWith(ident, second).expect(200);
    const token = await requestReset(ident);
    const res = await post("reset-password", { token, password: "Brand-new-pass-2" });
    assert.equal(res.status, 200);
    errorOf(await loginWith(ident), 401, "INVALID_CREDENTIALS");
    await loginWith({ ...ident, password: "Brand-new-pass-2" }).expect(200);
    errorOf(await agent.get(`${API}/auth/me`), 401, "SESSION_ENDED");
    errorOf(await second.get(`${API}/auth/me`), 401, "SESSION_ENDED");
    errorOf(await agent.post(`${API}/auth/refresh`), 401, "INVALID_REFRESH_TOKEN");
  });

  it("rejects a link that was already used", async () => {
    const { ident } = await registerAndLogin();
    const token = await requestReset(ident);
    await post("reset-password", { token, password: "Brand-new-pass-2" }).expect(200);
    errorOf(await post("reset-password", { token, password: "Another-pass-3" }), 400, "TOKEN_USED");
  });

  it("rejects an expired link, an unknown token and a verification token", async () => {
    const { ident, token: verifyToken } = await signedUp();
    const token = await requestReset(ident);
    await expire(ident.email, "PASSWORD_RESET");
    errorOf(await post("reset-password", { token, password: PASSWORD }), 400, "TOKEN_EXPIRED");
    errorOf(
      await post("reset-password", { token: randomToken(), password: PASSWORD }),
      400,
      "TOKEN_INVALID",
    );
    errorOf(
      await post("reset-password", { token: verifyToken, password: PASSWORD }),
      400,
      "TOKEN_INVALID",
    );
  });

  it("rejects a weak password and keeps the link usable", async () => {
    const { ident } = await registerAndLogin();
    const token = await requestReset(ident);
    const res = await post("reset-password", { token, password: "short" });
    errorOf(res, 400, "VALIDATION_ERROR");
    assert.ok(res.body.error.fields.password);
    await post("reset-password", { token, password: "Brand-new-pass-2" }).expect(200);
  });
});
