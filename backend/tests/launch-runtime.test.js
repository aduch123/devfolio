import { before, after, it } from "node:test";
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import net from "node:net";
import { API, app, prisma, request, cleanupUsers, registerAndLogin } from "./helpers.js";
import { demoPortfolio } from "../utils/demoPortfolio.js";
before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});
it("compresses public HTML but not authentication responses", async () => {
  const demo = await request(app).get("/demo").set("Accept-Encoding", "gzip").expect(200);
  assert.equal(demo.headers["content-encoding"], "gzip");
  assert.match(demo.text, /Alex Example/);
  const auth = await request(app).get(`${API}/auth/me`).set("Accept-Encoding", "gzip").expect(401);
  assert.equal(auth.headers["content-encoding"], undefined);
});
it(
  "starts, checks database readiness and exits cleanly on SIGTERM",
  { timeout: 10000 },
  async () => {
    const socket = net.createServer();
    await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    const child = fork(new URL("../server.js", import.meta.url), [], {
      env: { ...process.env, NODE_ENV: "test", PORT: String(port) },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    try {
      await new Promise((resolve, reject) => {
        child.once("message", (value) =>
          value === "ready" ? resolve() : reject(Error("Unexpected startup response")),
        );
        child.once("exit", () => reject(Error("Server exited before readiness")));
        child.once("error", reject);
      });
      const health = await fetch(`http://127.0.0.1:${port}/healthz`);
      assert.equal(health.status, 200);
      await health.arrayBuffer();
      const exited = new Promise((resolve) =>
        child.once("exit", (code, signal) => resolve({ code, signal })),
      );
      child.kill("SIGTERM");
      assert.deepEqual(await exited, { code: 0, signal: null });
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
  },
);
it(
  "serves 50 concurrent public requests below the local p95 target",
  { skip: process.env.RUN_LAUNCH_PERF !== "1", timeout: 20000 },
  async () => {
    const { agent, ident } = await registerAndLogin();
    const user = await prisma.user.findUnique({ where: { username: ident.username } });
    await agent
      .patch(`${API}/profile`)
      .send({
        displayName: demoPortfolio.profile.displayName,
        headline: demoPortfolio.profile.headline,
        aboutText: demoPortfolio.profile.aboutText,
        heroRoleTexts: demoPortfolio.profile.heroRoleTexts,
      })
      .expect(200);
    await prisma.profile.update({ where: { userId: user.id }, data: { published: true } });
    await prisma.project.createMany({
      data: demoPortfolio.projects.map((item, sortOrder) => ({
        ...item,
        userId: user.id,
        sortOrder,
      })),
    });
    await prisma.skill.createMany({
      data: demoPortfolio.skills.map((item, sortOrder) => ({
        ...item,
        userId: user.id,
        sortOrder,
        category: "other",
        isCustom: true,
      })),
    });
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const url = `http://127.0.0.1:${server.address().port}/${ident.username}`;
    try {
      const warm = await fetch(url);
      await warm.arrayBuffer();
      const samples = await Promise.all(
        Array.from({ length: 50 }, async () => {
          const start = performance.now();
          const res = await fetch(url);
          assert.equal(res.status, 200);
          await res.arrayBuffer();
          return performance.now() - start;
        }),
      );
      samples.sort((a, b) => a - b);
      const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
      console.log(`50 concurrent public requests: p95 ${Math.round(p95)}ms`);
      assert.ok(p95 < 500, `p95 ${Math.round(p95)}ms exceeded 500ms`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
