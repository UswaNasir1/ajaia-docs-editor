import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import { documents, users } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import {
  convertImportBuffer,
  getImportExtension,
  MAX_IMPORT_BYTES,
  titleFromFilename,
  UNSUPPORTED_IMPORT_MESSAGE,
} from "@/lib/import";
import { sanitizeContentHtml } from "@/lib/sanitize";

export type ImportFileInput = {
  filename: string;
  size: number;
  buffer: Buffer;
};

export type ImportDocumentResult = {
  id: string;
  warnings: string[];
};

function assertImportFile(file: ImportFileInput) {
  if (!file.filename?.trim()) {
    throw new AppError("BAD_REQUEST", "File is required");
  }
  const extension = getImportExtension(file.filename);
  if (!extension) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", UNSUPPORTED_IMPORT_MESSAGE);
  }
  if (file.size > MAX_IMPORT_BYTES || file.buffer.byteLength > MAX_IMPORT_BYTES) {
    throw new AppError(
      "PAYLOAD_TOO_LARGE",
      "File exceeds the 2 MB import limit",
    );
  }
  if (file.size === 0 || file.buffer.byteLength === 0) {
    throw new AppError("BAD_REQUEST", "File is empty");
  }
  return extension;
}

/** Create a new owned document from an uploaded file. */
export async function importDocument(
  userId: string,
  file: ImportFileInput,
  db: Db = getDb(),
): Promise<ImportDocumentResult> {
  const extension = assertImportFile(file);
  const converted = await convertImportBuffer(extension, file.buffer);
  const contentHtml = sanitizeContentHtml(converted.html);
  if (!contentHtml.trim()) {
    throw new AppError("BAD_REQUEST", "File is empty");
  }

  const title = titleFromFilename(file.filename);
  const id = randomUUID();
  const now = new Date().toISOString();

  const owner = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });
  if (!owner) {
    throw new AppError("UNAUTHORIZED", "Not signed in");
  }

  await db.insert(documents).values({
    id,
    ownerId: userId,
    title,
    contentHtml,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  return { id, warnings: converted.warnings };
}
