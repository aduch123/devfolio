import { it, mock } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import https from "node:https";
import {
  checkLink,
  publicAddress,
  resolveSafeTarget,
  requestPinned,
} from "../modules/health/linkChecker.js";
const resolve = async () => [{ address: "93.184.216.34", family: 4 }];
it("rejects private/reserved addresses, mapped IPv6, alternate IPv4 and unsafe URLs before requesting", async () => {
  let calls = 0;
  for (const url of [
    "http://127.0.0.1",
    "http://169.254.169.254",
    "http://10.0.0.1",
    "http://172.16.0.1",
    "http://192.168.1.1",
    "http://100.64.0.1",
    "http://[::1]",
    "http://[fc00::1]",
    "http://[::ffff:127.0.0.1]",
    "http://2130706433",
    "http://0x7f000001",
    "http://localhost",
    "http://host.internal",
    "ftp://example.com",
    "https://user:password@example.com",
    "http://example.com:6379",
  ]) {
    const result = await checkLink(url, {
      resolve,
      request: async () => {
        calls++;
        return { status: 200 };
      },
    });
    assert.equal(result.status, "SKIPPED", url);
  }
  assert.equal(calls, 0);
  assert.equal(publicAddress("8.8.8.8"), true);
  assert.equal(publicAddress("2606:4700:4700::1111"), true);
});
it("rejects private DNS answers and redirects and pins a validated public address", async () => {
  let calls = 0;
  const result = await checkLink("https://public.example", {
    resolve: async (host) =>
      host === "private.example" ? [{ address: "10.0.0.1", family: 4 }] : await resolve(),
    request: async (target) => {
      calls++;
      assert.equal(target.address, "93.184.216.34");
      return { status: 302, location: "http://private.example/secret" };
    },
  });
  assert.equal(result.status, "SKIPPED");
  assert.equal(calls, 1);
  await assert.rejects(
    resolveSafeTarget("https://mixed.example", async () => [
      ...(await resolve()),
      { address: "127.0.0.1", family: 4 },
    ]),
  );
});
it("handles HEAD fallback, bot restrictions, broken links, timeouts and redirect limits", async () => {
  const methods = [];
  const ok = await checkLink("https://public.example", {
    resolve,
    request: async (_, method) => {
      methods.push(method);
      return { status: method === "HEAD" ? 405 : 200 };
    },
  });
  assert.equal(ok.status, "OK");
  assert.deepEqual(methods, ["HEAD", "GET"]);
  assert.equal(
    (await checkLink("https://public.example", { resolve, request: async () => ({ status: 403 }) }))
      .status,
    "SKIPPED",
  );
  assert.equal(
    (await checkLink("https://public.example", { resolve, request: async () => ({ status: 404 }) }))
      .status,
    "BROKEN",
  );
  assert.equal(
    (
      await checkLink("https://public.example", {
        resolve,
        request: async () => {
          throw Object.assign(Error("timeout"), { code: "ETIMEOUT" });
        },
      })
    ).status,
    "TIMEOUT",
  );
  assert.equal(
    (
      await checkLink("https://public.example", {
        resolve,
        request: async () => ({ status: 302, location: "/loop" }),
      })
    ).status,
    "BROKEN",
  );
});
it("transport keeps original TLS host, uses pinned lookup and enforces body/timeout caps", async () => {
  let mode = "ok";
  const replacement = mock.method(https, "request", (url, options, callback) => {
    assert.equal(url.hostname, "public.example");
    assert.equal(options.agent, false);
    assert.equal(options.maxHeaderSize, 16384);
    options.lookup("public.example", { all: true }, (error, addresses) => {
      assert.equal(error, null);
      assert.deepEqual(addresses, [{ address: "93.184.216.34", family: 4 }]);
    });
    const request = new EventEmitter();
    request.destroy = (error) => request.emit("error", error);
    request.end = () =>
      queueMicrotask(() => {
        const response = new EventEmitter();
        response.statusCode = 200;
        response.headers = {};
        response.resume = () => {};
        callback(response);
        if (mode === "large") response.emit("data", Buffer.alloc(65537));
        else if (mode === "ok") response.emit("end");
      });
    return request;
  });
  try {
    const target = await resolveSafeTarget("https://public.example", resolve);
    assert.equal((await requestPinned(target, "HEAD")).status, 200);
    mode = "large";
    await assert.rejects(requestPinned(target, "GET"), { code: "ESIZE" });
    mode = "stall";
    await assert.rejects(requestPinned(target, "HEAD", 10), { code: "ETIMEOUT" });
  } finally {
    replacement.mock.restore();
  }
});
