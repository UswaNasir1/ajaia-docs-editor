import { convertDocxToHtml } from "@/lib/import/docx";
import { convertMarkdownToHtml } from "@/lib/import/md";
import { convertTxtToHtml } from "@/lib/import/txt";
import { AppError } from "@/lib/errors";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const SUPPORTED_IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export type ImportExtension = (typeof SUPPORTED_IMPORT_EXTENSIONS)[number];

export const UNSUPPORTED_IMPORT_MESSAGE =
  "Supported types: .txt, .md, .docx";

export function getImportExtension(filename: string): ImportExtension | null {
  const lower = filename.toLowerCase();
  const match = SUPPORTED_IMPORT_EXTENSIONS.find((ext) => lower.endsWith(ext));
  return match ?? null;
}

export function titleFromFilename(filename: string): string {
  const ext = getImportExtension(filename);
  const base = ext
    ? filename.slice(0, filename.length - ext.length)
    : filename.replace(/\.[^.]+$/, "");
  const trimmed = base.trim();
  if (!trimmed) return "Imported document";
  return trimmed.length > 120 ? trimmed.slice(0, 120) : trimmed;
}

export type ConvertedImport = {
  html: string;
  warnings: string[];
};

export async function convertImportBuffer(
  extension: ImportExtension,
  buffer: Buffer,
): Promise<ConvertedImport> {
  if (extension === ".txt") {
    return { html: convertTxtToHtml(buffer.toString("utf8")), warnings: [] };
  }
  if (extension === ".md") {
    return {
      html: convertMarkdownToHtml(buffer.toString("utf8")),
      warnings: [],
    };
  }
  if (extension === ".docx") {
    return convertDocxToHtml(buffer);
  }
  throw new AppError("UNSUPPORTED_MEDIA_TYPE", UNSUPPORTED_IMPORT_MESSAGE);
}
