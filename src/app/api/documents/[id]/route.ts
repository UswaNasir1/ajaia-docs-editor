import { getSessionUser } from "@/lib/auth/session";
import {
  AppError,
  appErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/errors";
import {
  deleteDocument,
  getDocument,
  updateDocument,
} from "@/lib/services/documents";
import { updateDocumentSchema } from "@/lib/validation/documents";
import { zodFieldMessage } from "@/lib/validation/zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Not signed in");
    }

    const { id } = await context.params;
    const doc = await getDocument(user.id, id);
    if (!doc) {
      return errorResponse("NOT_FOUND", "Document not found");
    }
    return Response.json(
      {
        currentUserId: user.id,
        currentUserName: user.name,
        document: doc,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    return internalErrorResponse();
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
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
        zodFieldMessage(
          parsed.error,
          "Invalid update payload (title/contentHtml and baseVersion required)",
        ),
      );
    }

    const { id } = await context.params;
    const document = await updateDocument(user.id, id, parsed.data);
    return Response.json({
      currentUserId: user.id,
      currentUserName: user.name,
      document,
    });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    return internalErrorResponse();
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Not signed in");
    }

    const { id } = await context.params;
    await deleteDocument(user.id, id);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    return internalErrorResponse();
  }
}
