import { getSessionUser } from "@/lib/auth/session";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Not signed in");
  }
  return Response.json({ user });
}
