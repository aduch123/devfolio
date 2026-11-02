import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
export function sendAnalytics(base, kind, payload, transport = {}) {
  const nav = transport.navigator ?? globalThis.navigator;
  const fetcher = transport.fetch ?? globalThis.fetch;
  const url = `${API_PREFIX}${base}/${kind}`;
  try {
    const body = JSON.stringify(payload);
    if (nav?.sendBeacon?.(url, new Blob([body], { type: "application/json" }))) return;
    const pending = fetcher(url, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
    });
    pending?.catch?.(() => {});
  } catch {
    /* Analytics must never interrupt the portfolio. */
  }
}
export function startEngagement(base) {
  let referrer;
  try {
    referrer = document.referrer ? new URL(document.referrer).origin : undefined;
  } catch {
    /* invalid referrer */
  }
  sendAnalytics(base, "view", { referrer });
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest?.("a[data-track-type]");
    if (anchor)
      sendAnalytics(base, "click", {
        targetType: anchor.dataset.trackType,
        target: anchor.dataset.trackTarget,
      });
  });
  document.addEventListener("portfolio-contact-sent", () =>
    sendAnalytics(base, "click", { targetType: "CONTACT" }),
  );
  void (async () => {
    const result = await apiFetch(`${API_PREFIX}${base}/engagement`, { anonymous: true });
    if (!result.ok) return;
    let liked = result.data.liked;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-outline";
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    const update = (data) => {
      liked = data.liked;
      button.textContent = `${liked ? "♥ Liked" : "♡ Like"} · ${data.likes}`;
      button.setAttribute("aria-pressed", String(liked));
    };
    update(result.data);
    button.addEventListener("click", async () => {
      button.disabled = true;
      const response = await apiFetch(`${API_PREFIX}${base}/like`, {
        method: liked ? "DELETE" : "POST",
        anonymous: true,
      });
      button.disabled = false;
      if (response.ok) {
        update(response.data);
        status.textContent = "";
      } else status.textContent = "Could not update your like. Please try again.";
    });
    document.querySelector(".hero-buttons")?.append(button, status);
  })();
}
