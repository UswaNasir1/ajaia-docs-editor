import { getSessionUser } from "@/lib/auth/session";
import {
  AppError,
  appErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/errors";
import { removeShare, updateShareRole } from "@/lib/services/shares";
import { updateShareSchema } from "@/lib/validation/shares";
import { zodFieldMessage } from "@/lib/validation/zod";

type RouteContext = { params: Promise<{ id: string; userId: string }> };

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

    const parsed = updateShareSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "BAD_REQUEST",
        zodFieldMessage(parsed.error, "Role must be viewer or editor"),
      );
    }

    const { id, userId } = await context.params;
    const share = await updateShareRole(user.id, id, userId, parsed.data.role);
    return Response.json({ share });
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

    const { id, userId } = await context.params;
    await removeShare(user.id, id, userId);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    return internalErrorResponse();
  }
}
