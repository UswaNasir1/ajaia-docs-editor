import type { ZodError } from "zod";

/** First zod issue as a field-oriented 400 message. */
export function zodFieldMessage(error: ZodError, fallback: string): string {
  const issue = error.issues[0];
  if (!issue) return fallback;
  const field = issue.path.length > 0 ? issue.path.join(".") : null;
  return field ? `${field}: ${issue.message}` : issue.message;
}
