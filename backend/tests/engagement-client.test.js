import { it } from "node:test";
import assert from "node:assert/strict";
import { sendAnalytics } from "../../frontend/js/engagement.js";
it("uses a beacon without blocking navigation and falls back safely", async () => {
  let sent = 0,
    fetches = 0;
  sendAnalytics(
    "/portfolio/developer",
    "click",
    { targetType: "CONTACT" },
    {
      navigator: {
        sendBeacon() {
          sent++;
          return true;
        },
      },
      fetch() {
        fetches++;
      },
    },
  );
  assert.equal(sent, 1);
  assert.equal(fetches, 0);
  sendAnalytics(
    "/portfolio/developer",
    "view",
    {},
    {
      navigator: {
        sendBeacon() {
          return false;
        },
      },
      fetch() {
        fetches++;
        return Promise.reject(Error("offline"));
      },
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(fetches, 1);
  assert.doesNotThrow(() =>
    sendAnalytics(
      "/portfolio/developer",
      "view",
      {},
      {
        navigator: {
          sendBeacon() {
            throw Error("blocked");
          },
        },
        fetch() {
          throw Error("offline");
        },
      },
    ),
  );
});
