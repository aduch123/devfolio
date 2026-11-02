export function readControls(controls) {
  return Object.fromEntries(
    [...controls].map(([name, input]) => [
      name,
      input.type === "checkbox"
        ? input.checked
        : ["heroRoleTexts", "tags"].includes(name)
          ? input.value
              .split(name === "tags" ? "," : "\n")
              .map((value) => value.trim())
              .filter(Boolean)
          : input.value,
    ]),
  );
}
export function changedFields(current, original) {
  return Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key]),
    ),
  );
}
