import { it } from "node:test";
import assert from "node:assert/strict";
import { setupInlineEditor } from "../../frontend/js/inlineEditor.js";

// A minimal DOM adapter exercises actual handlers and requests without launching a browser.
class Element {
  constructor(tag = "div") {
    this.tagName = tag;
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.classList = { add() {} };
    this.dataset = {};
    this.textContent = "";
    this.value = "";
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  after(node) {
    this.trigger = node;
  }
  replaceChildren(...nodes) {
    this.children = nodes;
  }
  contains(node) {
    return this.children.includes(node);
  }
  focus() {
    this.focused = true;
  }
  querySelector(selector) {
    return this.selectors?.[selector] || null;
  }
  emit(name, event = {}) {
    return this.listeners[name]?.(event);
  }
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
it("saves every inline field, preserves failed text, retries and warns before leaving", async () => {
  const original = {
    document: globalThis.document,
    window: globalThis.window,
    fetch: globalThis.fetch,
  };
  const ids = Object.fromEntries(
    ["hero-name", "about-content", "role-text"].map((id) => [id, new Element()]),
  );
  const names = ["about", "skills", "projects", "experience", "education", "contact"];
  const selectors = Object.fromEntries(names.map((name) => [`#${name} h2`, new Element("h2")]));
  for (const name of names) selectors[`#${name} h2`].textContent = name;
  const title = new Element("h3");
  const description = new Element("p");
  const card = new Element("article");
  card.dataset.projectIndex = "0";
  card.selectors = { h3: title, ".project-description": description };
  const hero = new Element();
  const calls = [];
  const messages = [];
  const windowEvents = {};
  let offline = false;
  globalThis.document = {
    createElement: (tag) => new Element(tag),
    getElementById: (id) => ids[id],
    querySelector: (selector) => (selector === ".editor-body" ? hero : selectors[selector]),
    querySelectorAll: () => [card],
  };
  globalThis.window = {
    location: { origin: "http://localhost" },
    parent: { postMessage: (message) => messages.push(message) },
    addEventListener: (name, handler) => {
      windowEvents[name] = handler;
    },
  };
  globalThis.fetch = async (path, options) => {
    if (offline) throw Error("offline");
    calls.push({ path, body: options.body && JSON.parse(options.body) });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        projects: [{ id: "project-1", title: "Original", description: "Original description" }],
      }),
    };
  };
  try {
    await setupInlineEditor({
      profile: { displayName: "Original", aboutText: "Original", heroRoleTexts: ["apps"] },
    });
    const fields = [
      ...names.map((name) => [selectors[`#${name} h2`], `Title ${name}`]),
      [ids["hero-name"], "New name"],
      [ids["about-content"], "New about"],
      [ids["role-text"], "apps\nwebsites"],
      ...hero.children.map((element) => [element, "New field"]),
      [title, "New project"],
      [description, "New description"],
    ];
    for (const [element, value] of fields) {
      element.trigger.emit("click");
      const input = element.children[0];
      assert.equal(input.focused, true);
      input.value = value;
      input.emit("input");
    }
    let prevented = false;
    windowEvents.beforeunload({
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
    await wait(650);
    assert.equal(calls.filter((call) => call.body).length, fields.length);
    assert.ok(calls.some((call) => call.body?.heroRoleTexts?.join(",") === "apps,websites"));
    assert.ok(
      calls.some(
        (call) => call.path.endsWith("projects/project-1") && call.body?.title === "New project",
      ),
    );
    assert.equal(messages.at(-1).dirty, false);
    offline = true;
    const input = ids["about-content"].children[0];
    input.value = "Keep this offline text";
    input.emit("input");
    await wait(650);
    assert.equal(ids["about-content"].children[3].hidden, false);
    assert.equal(input.value, "Keep this offline text");
    offline = false;
    await ids["about-content"].children[3].emit("click");
    await wait(0);
    assert.equal(ids["about-content"].children[3].hidden, true);
    assert.equal(messages.at(-1).dirty, false);
    input.selectionStart = 0;
    input.selectionEnd = input.value.length;
    input.emit("paste", {
      preventDefault() {},
      clipboardData: { getData: () => "<script>alert(1)</script>" },
    });
    assert.equal(input.value, "<script>alert(1)</script>");
    await wait(650);
    assert.equal(calls.at(-1).body.aboutText, "<script>alert(1)</script>");
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
