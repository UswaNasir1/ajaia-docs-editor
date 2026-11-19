import { getSessionUser } from "@/lib/auth/session";
import { AppError, appErrorResponse, errorResponse } from "@/lib/errors";
import { addOrUpdateShare, listShares } from "@/lib/services/shares";
import { createShareSchema } from "@/lib/validation/shares";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Not signed in");
  }

  const { id } = await context.params;
  try {
    const data = await listShares(user.id, id);
    return Response.json(data);
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    throw err;
  }
}

export async function POST(request: Request, context: RouteContext) {
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

  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("BAD_REQUEST", "Email and role (viewer|editor) are required");
  }

  const { id } = await context.params;
  try {
    const share = await addOrUpdateShare(user.id, id, parsed.data);
    return Response.json({ share }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    throw err;
  }
}
