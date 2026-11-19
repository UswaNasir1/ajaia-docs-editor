import { afterEach, describe, expect, it } from "vitest";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { eq } from "drizzle-orm";
import { documents, users } from "@/lib/db/schema";
import {
  convertImportBuffer,
  getImportExtension,
  MAX_IMPORT_BYTES,
  titleFromFilename,
  UNSUPPORTED_IMPORT_MESSAGE,
} from "@/lib/import";
import { convertMarkdownToHtml } from "@/lib/import/md";
import { convertTxtToHtml } from "@/lib/import/txt";
import { sanitizeContentHtml } from "@/lib/sanitize";
import { importDocument } from "@/lib/services/import-document";
import { createTestDb } from "@/lib/test/db";

async function buildDocxFixture(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun("Imported Heading")],
          }),
          new Paragraph({
            children: [
              new TextRun("Hello "),
              new TextRun({ text: "bold", bold: true }),
              new TextRun(" world"),
            ],
          }),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

describe("import converters", () => {
  it("maps markdown headings, bold, and lists to expected tags", () => {
    const html = sanitizeContentHtml(
      convertMarkdownToHtml("# Title\n\n**bold**\n\n- one\n- two"),
    );
    expect(html).toContain("<h1>");
    expect(html).toContain("Title");
    expect(html).toMatch(/<(strong|b)>bold<\/(strong|b)>/);
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
  });

  it("turns txt blank-line paragraphs and newlines into p/br", () => {
    const html = convertTxtToHtml("Line one\nLine two\n\nSecond para");
    expect(html).toBe("<p>Line one<br>Line two</p><p>Second para</p>");
  });

  it("strips script tags and onerror attributes via sanitizer", () => {
    const dirty =
      '<p>Hi</p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">x</a>';
    const clean = sanitizeContentHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<p>Hi</p>");
  });

  it("imports a tiny generated .docx with heading and bold", async () => {
    const buffer = await buildDocxFixture();
    const { html, warnings } = await convertImportBuffer(".docx", buffer);
    const clean = sanitizeContentHtml(html);
    expect(clean.toLowerCase()).toContain("imported heading");
    expect(clean).toMatch(/<(strong|b)>bold<\/(strong|b)>/i);
    expect(Array.isArray(warnings)).toBe(true);
  });
});

describe("importDocument validation", () => {
  let close: (() => void) | undefined;

  afterEach(() => {
    close?.();
    close = undefined;
  });

  it("rejects unsupported extension with 415 message", async () => {
    const testDb = await createTestDb();
    close = testDb.close;
    await testDb.db.insert(users).values({
      id: "u_import",
      email: "import@test",
      name: "Importer",
      passwordHash: "x",
    });

    await expect(
      importDocument(
        "u_import",
        {
          filename: "notes.pdf",
          size: 4,
          buffer: Buffer.from("%PDF"),
        },
        testDb.db,
      ),
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: UNSUPPORTED_IMPORT_MESSAGE,
    });
  });

  it("rejects oversized files with PAYLOAD_TOO_LARGE", async () => {
    const testDb = await createTestDb();
    close = testDb.close;
    await testDb.db.insert(users).values({
      id: "u_import2",
      email: "import2@test",
      name: "Importer",
      passwordHash: "x",
    });

    const big = Buffer.alloc(MAX_IMPORT_BYTES + 1, 97);
    await expect(
      importDocument(
        "u_import2",
        {
          filename: "big.txt",
          size: big.byteLength,
          buffer: big,
        },
        testDb.db,
      ),
    ).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  async function seedUser(id: string) {
    const testDb = await createTestDb();
    close = testDb.close;
    await testDb.db.insert(users).values({
      id,
      email: `${id}@test`,
      name: "Importer",
      passwordHash: "x",
    });
    return testDb;
  }

  it("creates an owned document from markdown", async () => {
    const testDb = await seedUser("u_import3");

    const result = await importDocument(
      "u_import3",
      {
        filename: "Notes.md",
        size: 20,
        buffer: Buffer.from("# Hello\n\n**world**"),
      },
      testDb.db,
    );

    expect(result.id).toBeTruthy();
    const row = await testDb.db.query.documents.findFirst({
      where: eq(documents.id, result.id),
    });
    expect(row?.ownerId).toBe("u_import3");
    expect(row?.title).toBe("Notes");
    expect(row?.contentHtml).toContain("<h1>");
    expect(row?.contentHtml).toMatch(/<(strong|b)>world<\/(strong|b)>/);
  });

  it("rejects empty files", async () => {
    const testDb = await seedUser("u_import_empty");
    await expect(
      importDocument(
        "u_import_empty",
        { filename: "empty.txt", size: 0, buffer: Buffer.alloc(0) },
        testDb.db,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "File is empty" });
  });

  it("creates a document from txt with paragraphs", async () => {
    const testDb = await seedUser("u_import_txt");
    const body = "Alpha\nBeta\n\nGamma";
    const result = await importDocument(
      "u_import_txt",
      {
        filename: "notes.TXT",
        size: Buffer.byteLength(body),
        buffer: Buffer.from(body),
      },
      testDb.db,
    );
    const row = await testDb.db.query.documents.findFirst({
      where: eq(documents.id, result.id),
    });
    expect(row?.title).toBe("notes");
    expect(row?.contentHtml).toMatch(/<p>Alpha<br\s*\/?>Beta<\/p><p>Gamma<\/p>/);
  });

  it("sanitizes script payloads in markdown before save", async () => {
    const testDb = await seedUser("u_import_xss");
    const md = '# Safe\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">';
    const result = await importDocument(
      "u_import_xss",
      {
        filename: "xss.md",
        size: Buffer.byteLength(md),
        buffer: Buffer.from(md),
      },
      testDb.db,
    );
    const row = await testDb.db.query.documents.findFirst({
      where: eq(documents.id, result.id),
    });
    expect(row?.contentHtml).toContain("<h1>");
    expect(row?.contentHtml).not.toContain("<script");
    expect(row?.contentHtml).not.toContain("onerror");
  });

  it("creates a document from generated docx", async () => {
    const testDb = await seedUser("u_import_docx");
    const buffer = await buildDocxFixture();
    const result = await importDocument(
      "u_import_docx",
      {
        filename: "Brief.docx",
        size: buffer.byteLength,
        buffer,
      },
      testDb.db,
    );
    const row = await testDb.db.query.documents.findFirst({
      where: eq(documents.id, result.id),
    });
    expect(row?.title).toBe("Brief");
    expect(row?.contentHtml.toLowerCase()).toContain("imported heading");
    expect(row?.contentHtml).toMatch(/<(strong|b)>bold<\/(strong|b)>/i);
  });
});

describe("import helpers", () => {
  it("resolves extensions case-insensitively", () => {
    expect(getImportExtension("A.TXT")).toBe(".txt");
    expect(getImportExtension("b.Md")).toBe(".md");
    expect(getImportExtension("c.DOCX")).toBe(".docx");
    expect(getImportExtension("nope.pdf")).toBeNull();
  });

  it("derives title from filename", () => {
    expect(titleFromFilename("My Notes.md")).toBe("My Notes");
    expect(titleFromFilename(".md")).toBe("Imported document");
  });
});
