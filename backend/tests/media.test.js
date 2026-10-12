import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { API, app, prisma, request, cleanupUsers, errorOf, registerAndLogin } from "./helpers.js";
import { storage } from "../config/storage.js";
import { runCleanup } from "../jobs/cleanup.js";

before(cleanupUsers);
after(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
  fs.rmSync(storage.root, { recursive: true, force: true });
});

const png = () => sharp({ create: { width: 40, height: 30, channels: 3, background: "#cc3300" } }).png().toBuffer();
const pdf = () => Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const onDisk = (url) => path.join(storage.root, url.slice("/uploads/".length));
const exists = (url) => fs.existsSync(onDisk(url));
const filesIn = (kind) => (fs.existsSync(path.join(storage.root, kind)) ? fs.readdirSync(path.join(storage.root, kind)) : []);

const sendFile = (agent, route, buffer, filename, contentType) =>
  agent.post(`${API}${route}`).attach("file", buffer, { filename, contentType });

describe("avatar", () => {
  it("accepts a PNG, stores a 512px WebP under a random name and serves it safely", async () => {
    const { agent, ident } = await registerAndLogin();
    const res = await sendFile(agent, "/profile/avatar", await png(), "me.png", "image/png");
    assert.equal(res.status, 200);
    const url = res.body.profile.avatarUrl;
    assert.match(url, /^\/uploads\/avatars\/[0-9a-f]{32}\.webp$/);

    const meta = await sharp(onDisk(url)).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 512);

    const served = await request(app).get(url);
    assert.equal(served.status, 200);
    assert.equal(served.headers["content-type"], "image/webp");
    assert.equal(served.headers["x-content-type-options"], "nosniff");

    const pub = await request(app).get(`${API}/portfolio/${ident.username}`).expect(200);
    assert.equal(pub.body.profile.avatarUrl, url);
  });

  it("removes the old file when a new avatar replaces it, and on delete", async () => {
    const { agent } = await registerAndLogin();
    const first = (await sendFile(agent, "/profile/avatar", await png(), "a.png", "image/png").expect(200)).body.profile.avatarUrl;
    const second = (await sendFile(agent, "/profile/avatar", await png(), "b.png", "image/png").expect(200)).body.profile.avatarUrl;
    assert.notEqual(first, second);
    assert.equal(exists(first), false);
    assert.equal(exists(second), true);
    await agent.delete(`${API}/profile/avatar`).expect(204);
    assert.equal(exists(second), false);
    assert.equal((await agent.get(`${API}/profile`).expect(200)).body.profile.avatarUrl, null);
  });

  it("rejects an .exe renamed to .png, a PDF sent as an image and a corrupt PNG, and stores nothing", async () => {
    const { agent } = await registerAndLogin();
    const before = filesIn("avatars").length;
    const exe = Buffer.concat([Buffer.from("MZ\x90\x00\x03\x00\x00\x00"), Buffer.alloc(200, 1)]);
    const corrupt = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 7)]);
    for (const buf of [exe, pdf(), corrupt]) {
      errorOf(await sendFile(agent, "/profile/avatar", buf, "evil.png", "image/png"), 400, "INVALID_FILE");
    }
    assert.equal(filesIn("avatars").length, before);
  });

  it("rejects files over 2 MB with 413, and a request without a file with 400", async () => {
    const { agent } = await registerAndLogin();
    const big = Buffer.alloc(2 * 1024 * 1024 + 10, 1);
    errorOf(await sendFile(agent, "/profile/avatar", big, "big.png", "image/png"), 413, "FILE_TOO_LARGE");
    errorOf(await agent.post(`${API}/profile/avatar`).send({}), 400, "NO_FILE");
  });

  it("needs a login", async () => {
    errorOf(await sendFile(request(app), "/profile/avatar", await png(), "a.png", "image/png"), 401, "UNAUTHORIZED");
  });
});

describe("resume", () => {
  it("accepts a PDF, serves it as application/pdf, replaces and deletes it", async () => {
    const { agent } = await registerAndLogin();
    const first = (await sendFile(agent, "/profile/resume", pdf(), "cv.pdf", "application/pdf").expect(200)).body.profile.resumeUrl;
    assert.match(first, /^\/uploads\/resumes\/[0-9a-f]{32}\.pdf$/);
    assert.equal((await request(app).get(first)).headers["content-type"], "application/pdf");
    const second = (await sendFile(agent, "/profile/resume", pdf(), "cv2.pdf", "application/pdf").expect(200)).body.profile.resumeUrl;
    assert.equal(exists(first), false);
    await agent.delete(`${API}/profile/resume`).expect(204);
    assert.equal(exists(second), false);
  });

  it("rejects a PNG renamed to .pdf and files over 5 MB", async () => {
    const { agent } = await registerAndLogin();
    errorOf(await sendFile(agent, "/profile/resume", await png(), "cv.pdf", "application/pdf"), 400, "INVALID_FILE");
    const big = Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(5 * 1024 * 1024 + 10, 1)]);
    errorOf(await sendFile(agent, "/profile/resume", big, "cv.pdf", "application/pdf"), 413, "FILE_TOO_LARGE");
  });
});

describe("project cover", () => {
  const makeProject = async (agent) =>
    (await agent.post(`${API}/projects`).send({ title: "P" }).expect(201)).body.project.id;

  it("stores a resized WebP cover, and deleting the project removes the file", async () => {
    const { agent } = await registerAndLogin();
    const id = await makeProject(agent);
    const res = await sendFile(agent, `/projects/${id}/cover`, await png(), "c.png", "image/png");
    assert.equal(res.status, 200);
    const url = res.body.project.coverImageUrl;
    assert.match(url, /^\/uploads\/covers\/[0-9a-f]{32}\.webp$/);
    assert.equal(exists(url), true);
    await agent.delete(`${API}/projects/${id}`).expect(204);
    assert.equal(exists(url), false);
  });

  it("answers 404 for another user's project and writes nothing", async () => {
    const one = await registerAndLogin();
    const two = await registerAndLogin();
    const id = await makeProject(one.agent);
    const before = filesIn("covers").length;
    errorOf(await sendFile(two.agent, `/projects/${id}/cover`, await png(), "c.png", "image/png"), 404, "PROJECT_NOT_FOUND");
    errorOf(await two.agent.delete(`${API}/projects/${id}/cover`), 404, "PROJECT_NOT_FOUND");
    assert.equal(filesIn("covers").length, before);
  });

  it("rejects a non-image cover", async () => {
    const { agent } = await registerAndLogin();
    const id = await makeProject(agent);
    errorOf(await sendFile(agent, `/projects/${id}/cover`, pdf(), "c.png", "image/png"), 400, "INVALID_FILE");
  });
});

describe("storage and cleanup", () => {
  it("never removes a file outside the upload folder", async () => {
    const outside = path.join(path.dirname(storage.root), `outside-${Date.now()}.txt`);
    fs.writeFileSync(outside, "keep me");
    await storage.remove(`/uploads/../${path.basename(outside)}`);
    await storage.remove(outside);
    assert.equal(fs.existsSync(outside), true);
    fs.rmSync(outside);
  });

  it("the cleanup job deletes the files of accounts past the grace window", async () => {
    const { agent, ident } = await registerAndLogin();
    const url = (await sendFile(agent, "/profile/avatar", await png(), "a.png", "image/png").expect(200)).body.profile.avatarUrl;
    await prisma.user.update({ where: { email: ident.email }, data: { deletedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) } });
    await runCleanup();
    assert.equal(exists(url), false);
  });
});
