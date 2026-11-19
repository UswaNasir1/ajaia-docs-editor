import mammoth from "mammoth";

export type DocxConvertResult = {
  html: string;
  warnings: string[];
};

/** DOCX → HTML. Embedded images are not part of our schema. */
export async function convertDocxToHtml(
  buffer: Buffer,
): Promise<DocxConvertResult> {
  const result = await mammoth.convertToHtml({ buffer });
  const warnings: string[] = [];
  if (result.messages.length > 0) {
    warnings.push(
      `${result.messages.length} conversion warning(s) from .docx — images and unsupported elements may be skipped`,
    );
  }
  return { html: result.value, warnings };
}
