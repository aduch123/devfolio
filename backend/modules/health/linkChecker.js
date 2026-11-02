import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

export function publicAddress(address) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
async function timed(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error("Timed out"), { code: "ETIMEOUT" })),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function resolveSafeTarget(raw, resolve = lookup, timeoutMs = 3000) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw Error("Only public HTTP(S) links are checked");
  if (url.port && !["80", "443"].includes(url.port))
    throw Error("Non-standard ports are not checked");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (/(^|\.)(localhost|local|internal)$/i.test(hostname))
    throw Error("Private network address blocked");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await timed(resolve(hostname, { all: true, verbatim: true }), timeoutMs);
  if (
    !addresses.length ||
    addresses.length > 16 ||
    addresses.some((row) => !publicAddress(row.address))
  )
    throw Error("Private or reserved network address blocked");
  return { url, address: addresses[0].address, family: addresses[0].family };
}
export function requestPinned(target, method, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    let timer,
      finished = false;
    const finish = (error, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };
    const request = (target.url.protocol === "https:" ? https : http).request(
      target.url,
      {
        method,
        agent: false,
        maxHeaderSize: 16384,
        headers: { "User-Agent": "Devfolio-LinkChecker/1.0", Accept: "text/html,*/*;q=0.5" },
        // Pin the validated address while retaining the original Host header and TLS server name.
        lookup: (hostname, options, callback) =>
          options.all
            ? callback(null, [{ address: target.address, family: target.family }])
            : callback(null, target.address, target.family),
      },
      (response) => {
        let bytes = 0;
        response.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > 65536)
            request.destroy(Object.assign(new Error("Response limit exceeded"), { code: "ESIZE" }));
        });
        response.on("end", () =>
          finish(null, { status: response.statusCode, location: response.headers.location }),
        );
        response.on("error", (error) => finish(error));
        response.on("aborted", () => finish(Error("Response aborted")));
        response.resume();
      },
    );
    timer = setTimeout(
      () => request.destroy(Object.assign(new Error("Timed out"), { code: "ETIMEOUT" })),
      timeoutMs,
    );
    request.on("error", (error) => finish(error));
    request.end();
  });
}
export async function checkLink(
  raw,
  { resolve = lookup, request = requestPinned, timeoutMs = 3000 } = {},
) {
  try {
    let current = raw;
    for (let hop = 0; hop <= 5; hop++) {
      const target = await resolveSafeTarget(current, resolve, timeoutMs);
      let result = await request(target, "HEAD", timeoutMs);
      if ([405, 501].includes(result.status)) result = await request(target, "GET", timeoutMs);
      if ([301, 302, 303, 307, 308].includes(result.status)) {
        if (!result.location)
          return {
            status: "BROKEN",
            httpStatus: result.status,
            reason: "Redirect has no destination",
          };
        current = new URL(result.location, target.url).href;
        continue;
      }
      if ([401, 403, 429].includes(result.status))
        return {
          status: "SKIPPED",
          httpStatus: result.status,
          reason: "This site restricts automated checks",
        };
      return {
        status: result.status >= 200 && result.status < 400 ? "OK" : "BROKEN",
        httpStatus: result.status,
        reason: null,
      };
    }
    return { status: "BROKEN", httpStatus: null, reason: "Too many redirects" };
  } catch (error) {
    if (error.code === "ETIMEOUT" || error.code === "ETIMEDOUT")
      return { status: "TIMEOUT", httpStatus: null, reason: "The site took too long to respond" };
    const blocked = /blocked|Only public|Non-standard|Invalid URL/.test(error.message);
    return {
      status: blocked ? "SKIPPED" : "BROKEN",
      httpStatus: null,
      reason: blocked
        ? "This address is not eligible for safe public checks"
        : "The site could not be reached safely",
    };
  }
}
