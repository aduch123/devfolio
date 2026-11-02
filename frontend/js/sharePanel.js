import { API_PREFIX } from "./config.js";
import { apiFetch } from "./api.js";
import { make, toast, confirmModal } from "./ui.js";

export async function mountSharePanel(root, user) {
  const panel = make("section", "card");
  panel.id = "sharing";
  panel.append(make("h2", "", "Share your portfolio"));
  const publicUrl = `${window.location.origin}/${user.username}`;
  function button(label, action) {
    const el = make("button", "dash-btn dash-btn-ghost", label);
    el.type = "button";
    el.addEventListener("click", async () => {
      el.disabled = true;
      try {
        await action();
      } catch {
        toast("Could not complete this action. Try again.", "error");
      } finally {
        el.disabled = false;
      }
    });
    return el;
  }
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      toast("Link copied", "success");
    } catch {
      toast("Copy the link from the field instead.", "error");
    }
  }
  const publicField = make("input");
  publicField.readOnly = true;
  publicField.value = publicUrl;
  publicField.setAttribute("aria-label", "Public portfolio URL");
  const actions = make("div", "card-links");
  actions.append(
    publicField,
    button("Copy public URL", () => copy(publicUrl)),
  );
  for (const [label, href] of [
    [
      "LinkedIn",
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`,
    ],
    ["X", `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicUrl)}`],
    [
      "Email",
      `mailto:?subject=${encodeURIComponent("My portfolio")}&body=${encodeURIComponent(publicUrl)}`,
    ],
  ]) {
    const link = make("a", "card-link", label);
    link.href = href;
    if (!href.startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    actions.append(link);
  }
  panel.append(
    actions,
    make(
      "p",
      "",
      "Your public URL works when your portfolio is published. Private links can also open drafts.",
    ),
  );
  const qr = await apiFetch(`${API_PREFIX}/share-links/qr`);
  if (qr.ok) {
    const image = make("img");
    image.src = qr.data.dataUrl;
    image.alt = "QR code for your public portfolio URL";
    image.width = 180;
    image.height = 180;
    panel.append(image);
  }
  const form = make("form", "editor-form");
  const label = make("input");
  label.required = true;
  label.maxLength = 80;
  label.name = "label";
  const expiry = make("input");
  expiry.type = "datetime-local";
  expiry.name = "expiresAt";
  for (const [text, input] of [
    ["Private link label", label],
    ["Expiry (optional)", expiry],
  ]) {
    const wrap = make("label", "", text);
    wrap.append(input);
    form.append(wrap);
  }
  const submit = make("button", "dash-btn dash-btn-primary", "Create private link");
  submit.type = "submit";
  const error = make("p");
  error.setAttribute("role", "alert");
  const createdHost = make("div");
  createdHost.setAttribute("aria-live", "polite");
  form.append(submit, error);
  panel.append(form, createdHost);
  const list = make("div");
  panel.append(list);
  root.append(panel);
  async function load() {
    const result = await apiFetch(`${API_PREFIX}/share-links`);
    if (!result.ok) {
      list.textContent = result.error.message;
      return;
    }
    list.replaceChildren();
    if (!result.data.shareLinks.length) list.append(make("p", "", "No private links yet."));
    for (const link of result.data.shareLinks) {
      const row = make("div", "editor-item");
      const state = link.revokedAt
        ? "Revoked"
        : link.expiresAt && new Date(link.expiresAt) <= new Date()
          ? "Expired"
          : "Active";
      row.append(
        make("strong", "", link.label),
        make("span", "", state),
        make("span", "", `${link.viewCount || 0} views`),
        make(
          "span",
          "",
          link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleString()}` : "No expiry",
        ),
      );
      if (!link.revokedAt) {
        const editor = make("details");
        editor.append(make("summary", "", "Edit label or expiry"));
        const editLabel = make("input");
        editLabel.value = link.label;
        editLabel.maxLength = 80;
        editLabel.setAttribute("aria-label", "Link label");
        const editExpiry = make("input");
        editExpiry.type = "datetime-local";
        editExpiry.setAttribute("aria-label", "New expiry (blank removes expiry)");
        if (link.expiresAt) {
          const date = new Date(link.expiresAt);
          editExpiry.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        }
        editor.append(
          editLabel,
          editExpiry,
          button("Save link settings", async () => {
            const result = await apiFetch(`${API_PREFIX}/share-links/${link.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                label: editLabel.value,
                expiresAt: editExpiry.value ? new Date(editExpiry.value).toISOString() : null,
              }),
            });
            if (!result.ok) {
              toast(
                Object.values(result.error.fields || {}).join(" ") || result.error.message,
                "error",
              );
              return;
            }
            await load();
          }),
        );
        row.append(
          editor,
          button("Revoke", async () => {
            if (
              !(await confirmModal({
                title: "Revoke private link?",
                message:
                  "Anyone using this link will lose access. You can create a new link later.",
                danger: true,
              }))
            )
              return;
            const result = await apiFetch(`${API_PREFIX}/share-links/${link.id}`, {
              method: "DELETE",
            });
            if (!result.ok) {
              toast(result.error.message, "error");
              return;
            }
            await load();
          }),
        );
      }
      list.append(row);
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    error.textContent = "";
    const result = await apiFetch(`${API_PREFIX}/share-links`, {
      method: "POST",
      body: JSON.stringify({
        label: label.value,
        expiresAt: expiry.value ? new Date(expiry.value).toISOString() : null,
      }),
    });
    submit.disabled = false;
    if (!result.ok) {
      error.textContent =
        Object.values(result.error.fields || {}).join(" ") || result.error.message;
      return;
    }
    const url = `${window.location.origin}/share/${result.data.token}`;
    const input = make("input");
    input.readOnly = true;
    input.value = url;
    input.setAttribute("aria-label", "New private link (shown once)");
    createdHost.replaceChildren(
      make("p", "", "Copy this private link now. It is shown only once."),
      input,
      button("Copy private link", () => copy(url)),
    );
    form.reset();
    await load();
  });
  await load();
  if (window.location.hash === "#sharing") panel.scrollIntoView();
}
