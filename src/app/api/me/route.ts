import { getSessionUser } from "@/lib/auth/session";
import { errorResponse, internalErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Not signed in");
    }
    return Response.json({ user });
  } catch {
    return internalErrorResponse();
  }
}
