import { getSessionUser } from "@/lib/auth/session";
import { AppError, appErrorResponse, errorResponse } from "@/lib/errors";
import { removeShare, updateShareRole } from "@/lib/services/shares";
import { updateShareSchema } from "@/lib/validation/shares";

type RouteContext = { params: Promise<{ id: string; userId: string }> };

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

  const parsed = updateShareSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", "Role must be viewer or editor");
  }

  const { id, userId } = await context.params;
  try {
    const share = await updateShareRole(user.id, id, userId, parsed.data.role);
    return Response.json({ share });
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

  const { id, userId } = await context.params;
  try {
    await removeShare(user.id, id, userId);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    throw err;
  }
}
