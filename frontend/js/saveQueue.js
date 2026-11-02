// Serializes writes globally and coalesces pending values per field.
export function createSaveQueue({ save, onState = () => {}, delay = 500 }) {
  const pending = new Map();
  const failed = new Map();
  const timers = new Map();
  const scheduled = new Map();
  const versions = new Map();
  let running = false;
  async function drain() {
    if (running) return;
    running = true;
    try {
      while (pending.size) {
        const [key, entry] = pending.entries().next().value;
        pending.delete(key);
        try {
          await save(key, entry.value);
          if (versions.get(key) === entry.version) {
            failed.delete(key);
            onState(key, "Saved");
          }
        } catch (error) {
          if (versions.get(key) === entry.version) {
            failed.set(key, entry);
            onState(key, "Failed", error);
          }
        }
      }
    } finally {
      running = false;
    }
  }
  function enqueue(key, value) {
    const version = (versions.get(key) || 0) + 1;
    versions.set(key, version);
    clearTimeout(timers.get(key));
    pending.delete(key);
    failed.delete(key);
    onState(key, "Saving");
    scheduled.set(key, { value, version });
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        scheduled.delete(key);
        pending.set(key, { value, version });
        void drain();
      }, delay),
    );
  }
  return {
    enqueue,
    flush() {
      for (const [key, entry] of scheduled) {
        clearTimeout(timers.get(key));
        pending.set(key, entry);
      }
      timers.clear();
      scheduled.clear();
      return drain();
    },
    retry(key) {
      const entry = failed.get(key);
      if (!entry) return;
      failed.delete(key);
      pending.set(key, entry);
      onState(key, "Saving");
      return drain();
    },
    get dirty() {
      return running || pending.size > 0 || failed.size > 0 || timers.size > 0;
    },
  };
}
