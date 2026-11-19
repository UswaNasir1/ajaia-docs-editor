import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    contentHtml: z.string().optional(),
    baseVersion: z.number().int().positive(),
  })
  .refine((data) => data.title !== undefined || data.contentHtml !== undefined, {
    message: "Provide title and/or contentHtml",
  });

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
