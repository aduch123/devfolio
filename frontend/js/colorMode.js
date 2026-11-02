// Runs before first paint; no account data or credentials are stored here.
(() => {
  const root = document.documentElement;
  const portfolio = root.hasAttribute("data-portfolio");
  let mode = root.dataset.colorMode || "auto";
  try {
    if (location.pathname !== "/preview") {
      const saved = localStorage.getItem(
        portfolio ? "devfolio-portfolio-mode" : "devfolio-app-mode",
      );
      if (["auto", "light", "dark"].includes(saved)) mode = saved;
    }
  } catch {
    /* storage unavailable */
  }
  root.dataset.colorMode = mode;
})();
