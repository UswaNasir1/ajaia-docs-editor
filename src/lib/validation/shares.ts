import { z } from "zod";

export const shareRoleSchema = z.enum(["viewer", "editor"]);

export const createShareSchema = z.object({
  email: z.string().email(),
  role: shareRoleSchema,
});

export const updateShareSchema = z.object({
  role: shareRoleSchema,
});

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateShareInput = z.infer<typeof updateShareSchema>;
