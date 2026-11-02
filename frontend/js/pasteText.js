export function pasteText(current, start, end, pasted, maxLength) {
  const plain = String(pasted).replace(/\r\n?/g, "\n");
  const available = Math.max(0, maxLength - (current.length - (end - start)));
  return current.slice(0, start) + plain.slice(0, available) + current.slice(end);
}
