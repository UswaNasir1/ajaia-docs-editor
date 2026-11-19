import { marked } from "marked";

/** Markdown → HTML via marked (sanitize separately). */
export function convertMarkdownToHtml(markdown: string): string {
  // Sync parse is fine for our size limit (≤ 2 MB).
  return marked.parse(markdown, { async: false }) as string;
}
