import { it } from "node:test";
import assert from "node:assert/strict";
import { createSaveQueue } from "../../frontend/js/saveQueue.js";
import { pasteText } from "../../frontend/js/pasteText.js";
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
it("serializes in-flight writes and coalesces newer pending edits", async () => {
  const calls = [];
  let release;
  const queue = createSaveQueue({
    delay: 0,
    save: async (key, value) => {
      calls.push([key, value]);
      if (value === "first")
        await new Promise((resolve) => {
          release = resolve;
        });
    },
  });
  queue.enqueue("name", "first");
  await tick();
  queue.enqueue("name", "second");
  queue.enqueue("name", "third");
  await tick();
  assert.deepEqual(calls, [["name", "first"]]);
  release();
  await tick();
  assert.deepEqual(calls, [
    ["name", "first"],
    ["name", "third"],
  ]);
  assert.equal(queue.dirty, false);
});
it("retains failed values for retry and reports unsaved work", async () => {
  let fail = true;
  const states = [];
  const queue = createSaveQueue({
    delay: 0,
    onState: (_, state) => states.push(state),
    save: async () => {
      if (fail) throw Error("offline");
    },
  });
  queue.enqueue("about", "My work");
  await tick();
  assert.equal(queue.dirty, true);
  assert.equal(states.at(-1), "Failed");
  fail = false;
  await queue.retry("about");
  assert.equal(queue.dirty, false);
  assert.equal(states.at(-1), "Saved");
});
it("pastes text without interpreting markup and respects replacement length", () => {
  assert.equal(pasteText("abcd", 1, 3, "<script>", 6), "a<scrd");
  assert.equal(pasteText("", 0, 0, "a\r\nb", 10), "a\nb");
});

it("flushes debounced edits immediately for the save shortcut", async () => {
  const calls = [];
  const queue = createSaveQueue({
    delay: 10000,
    save: async (key, value) => {
      calls.push([key, value]);
    },
  });
  queue.enqueue("name", "Latest name");
  await queue.flush();
  assert.deepEqual(calls, [["name", "Latest name"]]);
  assert.equal(queue.dirty, false);
});
