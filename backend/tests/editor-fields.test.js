import { it } from "node:test";
import assert from "node:assert/strict";
import { readControls, changedFields } from "../../frontend/js/editorFields.js";
it("normalizes roles/tags and preserves boolean fields", () => {
  const controls = new Map([
    ["heroRoleTexts", { value: " apps \n\n APIs " }],
    ["tags", { value: "JS, CSS, " }],
    ["featured", { type: "checkbox", checked: true }],
  ]);
  assert.deepEqual(readControls(controls), {
    heroRoleTexts: ["apps", "APIs"],
    tags: ["JS", "CSS"],
    featured: true,
  });
});
it("sends only edited fields so newer unrelated server values survive", () => {
  const initial = { title: "Original", description: "Old description" };
  const panel = { title: "Original", description: "New description" };
  const server = { title: "Newer inline title", description: "Old description" };
  Object.assign(server, changedFields(panel, initial));
  assert.deepEqual(server, { title: "Newer inline title", description: "New description" });
  assert.deepEqual(changedFields(initial, initial), {});
});
