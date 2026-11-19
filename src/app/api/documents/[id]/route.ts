import { getSessionUser } from "@/lib/auth/session";
import { AppError, appErrorResponse, errorResponse } from "@/lib/errors";
import {
  deleteDocument,
  getDocument,
  updateDocument,
} from "@/lib/services/documents";
import { updateDocumentSchema } from "@/lib/validation/documents";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Not signed in");
  }

  const { id } = await context.params;
  const doc = await getDocument(user.id, id);
  if (!doc) {
    return errorResponse("NOT_FOUND", "Document not found");
  }
  return Response.json({ document: doc });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Not signed in");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "BAD_REQUEST",
      "Invalid update payload (title/contentHtml and baseVersion required)",
    );
  }

  const { id } = await context.params;
  try {
    const document = await updateDocument(user.id, id, parsed.data);
    return Response.json({ document });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    throw err;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Not signed in");
  }

  const { id } = await context.params;
  try {
    await deleteDocument(user.id, id);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    throw err;
  }
}
