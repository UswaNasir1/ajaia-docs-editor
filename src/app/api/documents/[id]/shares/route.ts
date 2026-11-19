import { getSessionUser } from "@/lib/auth/session";
import {
  AppError,
  appErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/errors";
import { addOrUpdateShare, listShares } from "@/lib/services/shares";
import { createShareSchema } from "@/lib/validation/shares";
import { zodFieldMessage } from "@/lib/validation/zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Not signed in");
    }

    const { id } = await context.params;
    const data = await listShares(user.id, id);
    return Response.json(data);
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    return internalErrorResponse();
  }
}

export async function POST(request: Request, context: RouteContext) {
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

    const parsed = createShareSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "BAD_REQUEST",
        zodFieldMessage(
          parsed.error,
          "Email and role (viewer|editor) are required",
        ),
      );
    }

    const { id } = await context.params;
    const share = await addOrUpdateShare(user.id, id, parsed.data);
    return Response.json({ share }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    return internalErrorResponse();
  }
}
