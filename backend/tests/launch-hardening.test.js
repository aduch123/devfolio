import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { API, app, prisma, request, cleanupUsers, registerAndLogin } from "./helpers.js";
import { createLogger } from "../config/logger.js";
import { createErrorReporter } from "../utils/errorReporter.js";
before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});
it("redacts bearer tokens, cookies, body and query data in production logging", () => {
  let output = "";
  const stream = new Writable({
    write(chunk, encoding, callback) {
      output += chunk;
      callback();
    },
  });
  const logger = createLogger({ mode: "production", destination: stream });
  logger.info(
    {
      req: {
        url: "private-url-fixture",
        query: { token: "query-token-fixture" },
        params: { token: "route-token-fixture" },
        body: { password: "body-password-fixture" },
        headers: { cookie: "cookie-fixture", authorization: "authorization-fixture" },
      },
      res: { headers: { "set-cookie": "response-cookie-fixture" } },
      password: "top-password-fixture",
    },
    "redaction check",
  );
  for (const secret of [
    "private-url-fixture",
    "query-token-fixture",
    "route-token-fixture",
    "body-password-fixture",
    "cookie-fixture",
    "authorization-fixture",
    "response-cookie-fixture",
    "top-password-fixture",
  ])
    assert.ok(!output.includes(secret));
  assert.match(output, /redaction check/);
});
it("reports sanitized error spikes once per cooldown without interrupting requests", async () => {
  let time = 0;
  const events = [];
  const report = createErrorReporter({
    now: () => time,
    notify: async (event) => events.push(event),
  });
  for (let i = 0; i < 6; i++) report({ requestId: "test-request-id" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(events.length, 1);
  assert.deepEqual(Object.keys(events[0]).sort(), ["count", "event", "requestId", "windowSeconds"]);
  time = 301000;
  for (let i = 0; i < 5; i++) report({ requestId: "next-id" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(events.length, 2);
  const fails = createErrorReporter({
    threshold: 1,
    notify: async () => {
      throw Error("collector offline");
    },
  });
  assert.doesNotThrow(() => fails());
  await new Promise((resolve) => setTimeout(resolve, 0));
});
it("uses fresh request IDs, preserves API JSON errors, and marks shutdown as unavailable", async () => {
  const a = await request(app).get("/healthz").expect(200),
    b = await request(app).get("/healthz").expect(200);
  assert.match(a.headers["x-request-id"], /^[a-f0-9-]{36}$/);
  assert.notEqual(a.headers["x-request-id"], b.headers["x-request-id"]);
  const api = await request(app).get(`${API}/not-a-route`).expect(404);
  assert.equal(api.body.error.code, "ROUTE_NOT_FOUND");
  const page = await request(app).get("/nested/missing").set("Accept", "text/html").expect(404);
  assert.match(page.text, /Page not found/);
  app.locals.shuttingDown = true;
  try {
    await request(app).get("/healthz").expect(503);
  } finally {
    app.locals.shuttingDown = false;
  }
});
it("revalidates public cache immediately after edit and unpublish", async () => {
  const { agent, ident } = await registerAndLogin();
  await prisma.profile.update({
    where: { userId: (await prisma.user.findUnique({ where: { username: ident.username } })).id },
    data: { published: true },
  });
  const own = await agent.get(`${API}/portfolio/me`).expect(200);
  assert.equal(own.headers["cache-control"], "no-store");
  const first = await request(app).get(`/${ident.username}`).expect(200);
  assert.match(first.headers["cache-control"], /must-revalidate/);
  await request(app).get(`/${ident.username}`).set("If-None-Match", first.headers.etag).expect(304);
  await agent.patch(`${API}/profile`).send({ headline: "A new headline" }).expect(200);
  const changed = await request(app)
    .get(`/${ident.username}`)
    .set("If-None-Match", first.headers.etag)
    .expect(200);
  assert.notEqual(changed.headers.etag, first.headers.etag);
  await agent.post(`${API}/profile/unpublish`).expect(200);
  await request(app)
    .get(`/${ident.username}`)
    .set("If-None-Match", changed.headers.etag)
    .expect(404);
});
