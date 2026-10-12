import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  API,
  app,
  prisma,
  request,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  PASSWORD,
  cleanupUsers,
  cookieHeader,
  cookiePair,
  errorOf,
  loginWith,
  newIdentity,
  registerAndLogin,
  signup,
  waitForMail,
} from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

describe("POST auth/signup", () => {
  it("creates the account, lowercases identity, hides the hash, sends a verification email", async () => {
    const ident = newIdentity();
    const res = await signup({
      email: ident.email.toUpperCase(),
      username: ident.username.toUpperCase(),
      password: PASSWORD,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, ident.email);
    assert.equal(res.body.user.username, ident.username);
    assert.equal(res.body.user.passwordHash, undefined);
    assert.equal(res.headers["set-cookie"], undefined);
    const row = await prisma.user.findUnique({ where: { email: ident.email } });
    assert.notEqual(row.passwordHash, PASSWORD);
    assert.equal(row.emailVerifiedAt, null);
    await waitForMail(ident.email, "Verify");
  });

  it("rejects a duplicate email with 409", async () => {
    const ident = newIdentity();
    await signup(ident).expect(201);
    errorOf(await signup({ ...ident, username: `${ident.username}x` }), 409, "USER_EXISTS");
  });

  it("rejects a duplicate username with 409", async () => {
    const ident = newIdentity();
    await signup(ident).expect(201);
    errorOf(await signup({ ...newIdentity(), username: ident.username }), 409, "USER_EXISTS");
  });

  it("rejects invalid fields with per-field messages", async () => {
    const res = await signup({ email: "not-an-email", username: "edit", password: "short" });
    errorOf(res, 400, "VALIDATION_ERROR");
    assert.ok(res.body.error.fields.email);
    assert.ok(res.body.error.fields.username);
    assert.ok(res.body.error.fields.password);
  });
});

describe("POST auth/login", () => {
  it("sets HttpOnly cookies, creates a session, and puts no token in the body", async () => {
    const { loginRes, ident } = await registerAndLogin();
    const cookies = loginRes.headers["set-cookie"];
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
      const c = cookies.find((x) => x.startsWith(`${name}=`));
      assert.ok(c, `${name} cookie missing`);
      assert.match(c, /HttpOnly/i);
      assert.match(c, /SameSite=Lax/i);
    }
    assert.equal(loginRes.body.token, undefined);
    assert.equal(loginRes.body.user.emailVerified, false);
    const session = await prisma.session.findFirst({ where: { user: { email: ident.email } } });
    assert.equal(session.refreshHash.length, 64);
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    const { ident } = await registerAndLogin();
    const wrong = await loginWith({ ...ident, password: "Wrong-password-9" });
    const unknown = await loginWith({ email: newIdentity().email, password: PASSWORD });
    errorOf(wrong, 401, "INVALID_CREDENTIALS");
    errorOf(unknown, 401, "INVALID_CREDENTIALS");
    assert.equal(wrong.body.error.message, unknown.body.error.message);
  });

  it("rejects a missing password with 400", async () => {
    const res = await request(app).post(`${API}/auth/login`).send({ email: newIdentity().email });
    errorOf(res, 400, "VALIDATION_ERROR");
    assert.ok(res.body.error.fields.password);
  });

  it("rejects a foreign Origin with 403", async () => {
    const ident = newIdentity();
    const res = await request(app)
      .post(`${API}/auth/login`)
      .set("Origin", "https://evil.example")
      .send(ident);
    errorOf(res, 403, "BAD_ORIGIN");
  });
});

describe("GET auth/username-available", () => {
  it("reports available, taken, reserved and invalid names", async () => {
    const { ident } = await registerAndLogin();
    const check = (name) =>
      request(app).get(`${API}/auth/username-available`).query({ username: name });
    const free = await check(`free-${Date.now().toString(36)}`);
    assert.deepEqual(free.body, { available: true });
    assert.equal((await check(ident.username)).body.reason, "taken");
    assert.equal((await check(ident.username.toUpperCase())).body.reason, "taken");
    assert.equal((await check("edit")).body.reason, "reserved");
    assert.equal((await check("a")).body.reason, "invalid");
    assert.equal((await request(app).get(`${API}/auth/username-available`)).body.available, false);
  });
});

describe("GET auth/me", () => {
  it("returns the logged-in user", async () => {
    const { agent, ident } = await registerAndLogin();
    const res = await agent.get(`${API}/auth/me`).expect(200);
    assert.equal(res.body.user.email, ident.email);
    assert.equal(res.body.user.emailVerified, false);
  });

  it("rejects a request with no cookie with 401", async () => {
    errorOf(await request(app).get(`${API}/auth/me`), 401, "UNAUTHORIZED");
  });

  it("rejects a garbage access cookie with 401", async () => {
    const res = await request(app)
      .get(`${API}/auth/me`)
      .set("Cookie", `${ACCESS_COOKIE}=not.a.jwt`);
    errorOf(res, 401, "INVALID_TOKEN");
  });

  it("stops working at once after logout", async () => {
    const { loginRes } = await registerAndLogin();
    const cookies = cookieHeader(loginRes);
    await request(app).get(`${API}/auth/me`).set("Cookie", cookies).expect(200);
    await request(app).post(`${API}/auth/logout`).set("Cookie", cookies).expect(204);
    errorOf(await request(app).get(`${API}/auth/me`).set("Cookie", cookies), 401, "SESSION_ENDED");
  });
});

describe("POST auth/refresh", () => {
  it("rotates the refresh token and issues new cookies", async () => {
    const { loginRes } = await registerAndLogin();
    const oldPair = cookiePair(loginRes, REFRESH_COOKIE);
    const res = await request(app).post(`${API}/auth/refresh`).set("Cookie", oldPair);
    assert.equal(res.status, 204);
    const newRefresh = cookiePair(res, REFRESH_COOKIE);
    assert.ok(newRefresh);
    assert.notEqual(newRefresh, oldPair);
    const access = cookiePair(res, ACCESS_COOKIE);
    await request(app).get(`${API}/auth/me`).set("Cookie", access).expect(200);
  });

  it("rejects a request without a cookie with 401", async () => {
    errorOf(await request(app).post(`${API}/auth/refresh`), 401, "NO_REFRESH_TOKEN");
  });

  it("rejects a made-up token with 401", async () => {
    const res = await request(app)
      .post(`${API}/auth/refresh`)
      .set("Cookie", `${REFRESH_COOKIE}=abc.def`);
    errorOf(res, 401, "INVALID_REFRESH_TOKEN");
  });

  it("accepts the previous token inside the grace window, only renewing access", async () => {
    const { loginRes } = await registerAndLogin();
    const first = cookiePair(loginRes, REFRESH_COOKIE);
    await request(app).post(`${API}/auth/refresh`).set("Cookie", first).expect(204);
    const again = await request(app).post(`${API}/auth/refresh`).set("Cookie", first);
    assert.equal(again.status, 204);
    assert.ok(cookiePair(again, ACCESS_COOKIE));
    assert.equal(cookiePair(again, REFRESH_COOKIE), undefined);
  });

  it("revokes the session when an old token comes back after the grace window", async () => {
    const { loginRes, ident } = await registerAndLogin();
    const first = cookiePair(loginRes, REFRESH_COOKIE);
    const rotated = await request(app).post(`${API}/auth/refresh`).set("Cookie", first).expect(204);
    const second = cookiePair(rotated, REFRESH_COOKIE);
    await prisma.session.updateMany({
      where: { user: { email: ident.email } },
      data: { rotatedAt: new Date(Date.now() - 60 * 1000) },
    });
    errorOf(
      await request(app).post(`${API}/auth/refresh`).set("Cookie", first),
      401,
      "REFRESH_TOKEN_REUSED",
    );
    errorOf(
      await request(app).post(`${API}/auth/refresh`).set("Cookie", second),
      401,
      "INVALID_REFRESH_TOKEN",
    );
  });
});

describe("POST auth/logout", () => {
  it("revokes the session so its refresh token stops working, and clears the cookies", async () => {
    const { loginRes } = await registerAndLogin();
    const refreshPair = cookiePair(loginRes, REFRESH_COOKIE);
    const res = await request(app).post(`${API}/auth/logout`).set("Cookie", refreshPair);
    assert.equal(res.status, 204);
    assert.match(res.headers["set-cookie"].join(";"), new RegExp(`${REFRESH_COOKIE}=;`));
    errorOf(
      await request(app).post(`${API}/auth/refresh`).set("Cookie", refreshPair),
      401,
      "INVALID_REFRESH_TOKEN",
    );
  });

  it("is harmless without a cookie or with a garbage one", async () => {
    await request(app).post(`${API}/auth/logout`).expect(204);
    await request(app)
      .post(`${API}/auth/logout`)
      .set("Cookie", `${REFRESH_COOKIE}=junk.value`)
      .expect(204);
  });

  it("only ends its own session", async () => {
    const { ident, loginRes } = await registerAndLogin();
    const other = await loginWith(ident).expect(200);
    await request(app)
      .post(`${API}/auth/logout`)
      .set("Cookie", cookiePair(loginRes, REFRESH_COOKIE))
      .expect(204);
    await request(app)
      .post(`${API}/auth/refresh`)
      .set("Cookie", cookiePair(other, REFRESH_COOKIE))
      .expect(204);
  });

  it("refuses a foreign Origin with 403", async () => {
    const res = await request(app).post(`${API}/auth/logout`).set("Origin", "https://evil.example");
    errorOf(res, 403, "BAD_ORIGIN");
  });
});
