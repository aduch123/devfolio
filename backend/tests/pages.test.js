import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  API,
  app,
  prisma,
  request,
  cleanupUsers,
  cookieHeader,
  registerAndLogin,
  ACCESS_COOKIE,
} from "./helpers.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

// supertest does not follow redirects, so every redirect can be checked on its own.
const redirectsTo = (res, location) => {
  assert.equal(res.status, 302, `expected 302, got ${res.status}`);
  assert.equal(res.headers.location, location);
};

const finishOnboarding = async (agent) => {
  await agent
    .put(`${API}/onboarding/step/1`)
    .send({ data: { displayName: "Page Tester" } })
    .expect(200);
  await agent.post(`${API}/onboarding/complete`).expect(200);
};

const GUEST_PAGES = ["/", "/login", "/signup"];

describe("page redirects: logged out", () => {
  it("sends app pages to /login and remembers where the visitor was going", async () => {
    redirectsTo(await request(app).get("/dashboard"), "/login?next=%2Fdashboard");
    redirectsTo(await request(app).get("/dashboard/messages"), "/login?next=%2Fdashboard%2Fmessages");
    redirectsTo(await request(app).get("/settings"), "/login?next=%2Fsettings");
  });

  it("sends pages that are not valid return targets to a plain /login", async () => {
    redirectsTo(await request(app).get("/onboarding"), "/login");
    redirectsTo(await request(app).get("/edit"), "/login");
  });

  it("shows the landing, login and signup pages without redirecting", async () => {
    for (const path of GUEST_PAGES) {
      const res = await request(app).get(path);
      assert.equal(res.status, 200, path);
      assert.equal(res.headers["cache-control"], "no-store", path);
    }
  });

  it("treats a garbage or foreign access cookie as logged out (no 500, no loop)", async () => {
    for (const cookie of [`${ACCESS_COOKIE}=garbage`, `${ACCESS_COOKIE}=a.b.c`, `${ACCESS_COOKIE}=`]) {
      redirectsTo(await request(app).get("/dashboard").set("Cookie", cookie), "/login?next=%2Fdashboard");
      assert.equal((await request(app).get("/login").set("Cookie", cookie)).status, 200);
    }
  });

  it("answers 404 for an unknown dashboard section instead of redirecting", async () => {
    const res = await request(app).get("/dashboard/not-a-section");
    assert.equal(res.status, 404);
  });
});

describe("page redirects: logged in, onboarding unfinished", () => {
  it("sends guest pages and the dashboard to the wizard, and the wizard loads", async () => {
    const { agent } = await registerAndLogin();
    for (const path of [...GUEST_PAGES, "/dashboard", "/dashboard/messages"]) {
      redirectsTo(await agent.get(path), "/onboarding");
    }
    assert.equal((await agent.get("/onboarding")).status, 200);
  });

  it("keeps settings and the editor reachable", async () => {
    const { agent } = await registerAndLogin();
    assert.equal((await agent.get("/settings")).status, 200);
    assert.equal((await agent.get("/edit")).status, 200);
  });

  it("lets ?reauth=1 show the login page (breaks a redirect loop)", async () => {
    const { agent } = await registerAndLogin();
    assert.equal((await agent.get("/login?reauth=1")).status, 200);
  });
});

describe("page redirects: logged in, onboarding finished", () => {
  it("sends guest pages to the dashboard, and the dashboard pages load", async () => {
    const { agent } = await registerAndLogin();
    await finishOnboarding(agent);
    for (const path of GUEST_PAGES) redirectsTo(await agent.get(path), "/dashboard");
    for (const path of ["/dashboard", "/dashboard/portfolio", "/dashboard/messages", "/settings", "/edit"]) {
      assert.equal((await agent.get(path)).status, 200, path);
    }
  });

  it("sends the wizard page to the dashboard", async () => {
    const { agent } = await registerAndLogin();
    await finishOnboarding(agent);
    redirectsTo(await agent.get("/onboarding"), "/dashboard");
  });

  it("has no redirect loop: every redirect target loads", async () => {
    const unfinished = await registerAndLogin();
    const finished = await registerAndLogin();
    await finishOnboarding(finished.agent);
    for (const { agent } of [unfinished, finished]) {
      for (const path of GUEST_PAGES) {
        const first = await agent.get(path);
        assert.equal(first.status, 302);
        assert.equal((await agent.get(first.headers.location)).status, 200, path);
      }
    }
  });
});

describe("page redirects: sessions that are no longer valid", () => {
  it("does not trust a cookie after logout", async () => {
    const { loginRes } = await registerAndLogin();
    const cookies = cookieHeader(loginRes);
    assert.equal((await request(app).get("/settings").set("Cookie", cookies)).status, 200);

    await request(app).post(`${API}/auth/logout`).set("Cookie", cookies).expect(204);

    redirectsTo(await request(app).get("/settings").set("Cookie", cookies), "/login?next=%2Fsettings");
    assert.equal((await request(app).get("/login").set("Cookie", cookies)).status, 200);
  });

  it("does not trust a cookie after the account is deleted", async () => {
    const { agent, loginRes, ident } = await registerAndLogin();
    const cookies = cookieHeader(loginRes);
    await agent.post(`${API}/account/delete`).send({ password: ident.password }).expect(204);
    redirectsTo(await request(app).get("/settings").set("Cookie", cookies), "/login?next=%2Fsettings");
  });
});
