import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { errorResponse, internalErrorResponse } from "@/lib/errors";
import { authenticateUser } from "@/lib/services/auth";
import { loginSchema } from "@/lib/validation/auth";
import { zodFieldMessage } from "@/lib/validation/zod";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "BAD_REQUEST",
      zodFieldMessage(parsed.error, "Email and password are required"),
    );
  }

  try {
    const email = parsed.data.email.trim().toLowerCase();
    const user = await authenticateUser(email, parsed.data.password);
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Invalid email or password");
    }

    const token = await createSessionToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch {
    return internalErrorResponse();
  }
}
