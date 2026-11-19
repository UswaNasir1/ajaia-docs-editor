import { getSessionUser } from "@/lib/auth/session";
import {
  AppError,
  appErrorResponse,
  errorResponse,
  internalErrorResponse,
} from "@/lib/errors";
import { createDocument, listDocuments } from "@/lib/services/documents";
import { createDocumentSchema } from "@/lib/validation/documents";
import { zodFieldMessage } from "@/lib/validation/zod";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Not signed in");
    }

    // Lists are computed only from the session user (see listDocuments):
    // owned  = documents.owner_id = sessionUser.id
    // shared = document_shares.user_id = sessionUser.id AND owner_id != sessionUser.id
    const docs = await listDocuments(user.id);
    return Response.json(
      {
        currentUserId: user.id,
        currentUserName: user.name,
        ...docs,
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

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Not signed in");
    }

    let body: unknown = {};
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        return errorResponse("BAD_REQUEST", "Invalid JSON body");
      }
    }

    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "BAD_REQUEST",
        zodFieldMessage(parsed.error, "Invalid document title"),
      );
    }

    const doc = await createDocument(user.id, parsed.data.title);
    return Response.json({ document: doc }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    return internalErrorResponse();
  }
}
