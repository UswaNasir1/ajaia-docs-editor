function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Blank-line paragraphs → `<p>`; single newlines → `<br>`. */
export function convertTxtToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const escaped = escapeHtml(block.trimEnd());
      if (!escaped.trim()) return "";
      return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("");
}
