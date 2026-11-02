export const THEMES = ["editor", "minimal", "bold", "gradient"];
export const MODES = ["auto", "light", "dark"];
export function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
function readableAccent(hex, background, toward) {
  let value = hex;
  const original = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16));
  for (let step = 0; step <= 100 && contrast(value, background) < 4.5; step++)
    value =
      "#" +
      original
        .map((channel) =>
          Math.round(channel + ((toward - channel) * step) / 100)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("");
  return value;
}
export function accentTokens(value = "#4c5fff") {
  const accent = /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : "#4c5fff";
  const onAccent =
    contrast(accent, "#ffffff") >= contrast(accent, "#000000") ? "#ffffff" : "#000000";
  return {
    "--accent": accent,
    "--on-accent": onAccent,
    "--accent-ink-light": readableAccent(accent, "#fafaf9", 0),
    "--accent-ink-dark": readableAccent(accent, "#1f2937", 255),
  };
}
export function applyPortfolioTheme(
  profile = {},
  document = globalThis.document,
  { preview = false } = {},
) {
  const root = document.documentElement;
  root.dataset.template = THEMES.includes(profile.theme) ? profile.theme : "editor";
  root.dataset.portfolio = "true";
  let mode = MODES.includes(profile.colorMode) ? profile.colorMode : "auto";
  if (!preview)
    try {
      const stored = localStorage.getItem("devfolio-portfolio-mode");
      if (MODES.includes(stored)) mode = stored;
    } catch {
      /* optional preference */
    }
  root.dataset.colorMode = mode;
  for (const [key, value] of Object.entries(accentTokens(profile.accentColor)))
    root.style.setProperty(key, value);
}
