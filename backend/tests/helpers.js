import "./setup.js";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/prisma.js";
import { testOutbox } from "../utils/mailer.js";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "../config/constants.js";

export { app, prisma, request, testOutbox, ACCESS_COOKIE, REFRESH_COOKIE };

const DOMAIN = "devfolio-test.dev";
export const PASSWORD = "Correct-horse-1";
export const API = "/api/v1";

let counter = 0;
export const newIdentity = () => {
  const id = `${Date.now().toString(36)}${(counter++).toString(36)}`;
  return { email: `u${id}@${DOMAIN}`, username: `t-${id}`, password: PASSWORD };
};

// Test users are recognized by their email domain; their rows cascade away with them.
export const cleanupUsers = async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  testOutbox.length = 0;
};

export const errorOf = (res, status, code) => {
  assert.equal(
    res.status,
    status,
    `expected ${status}, got ${res.status}: ${JSON.stringify(res.body)}`,
  );
  assert.equal(res.body.error?.code, code);
};

export const signup = (ident, agent = request(app)) => agent.post(`${API}/auth/signup`).send(ident);

export const loginWith = (ident, agent = request(app)) =>
  agent.post(`${API}/auth/login`).send({ email: ident.email, password: ident.password });

// "name=value" for a cookie set by a response (or undefined).
export const cookiePair = (res, name) => {
  const raw = (res.headers["set-cookie"] || []).find((c) => c.startsWith(`${name}=`));
  return raw ? raw.split(";")[0] : undefined;
};

export const cookieHeader = (res) =>
  [cookiePair(res, ACCESS_COOKIE), cookiePair(res, REFRESH_COOKIE)].filter(Boolean).join("; ");

// New user, logged in. Returns the agent (keeps cookies), the identity and the login response.
export async function registerAndLogin() {
  const ident = newIdentity();
  await signup(ident).expect(201);
  const agent = request.agent(app);
  const res = await loginWith(ident, agent).expect(200);
  return { agent, ident, user: res.body.user, loginRes: res };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Emails are sent without being awaited, so poll the outbox for the newest matching message.
export async function waitForMail(to, subjectPart) {
  for (let i = 0; i < 40; i++) {
    const found = [...testOutbox]
      .reverse()
      .find((m) => m.to === to && m.subject.includes(subjectPart));
    if (found) return found;
    await sleep(50);
  }
  throw new Error(`no "${subjectPart}" email for ${to}`);
}

export async function expectNoMail(to, subjectPart) {
  await sleep(400);
  assert.equal(testOutbox.filter((m) => m.to === to && m.subject.includes(subjectPart)).length, 0);
}

export const tokenFromMail = (mail) =>
  new URL(mail.text.match(/https?:\/\/\S+/)[0]).searchParams.get("token");

export const clearMail = () => {
  testOutbox.length = 0;
};

export const emailTokenRow = (email, type) =>
  prisma.emailToken.findFirst({ where: { type, user: { email } }, orderBy: { createdAt: "desc" } });
