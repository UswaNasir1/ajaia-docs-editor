import { getSessionUser } from "@/lib/auth/session";
import { AppError, appErrorResponse, errorResponse } from "@/lib/errors";
import { importDocument } from "@/lib/services/import-document";

// Note: `export const runtime = "nodejs"` is incompatible with cacheComponents.
// App Router route handlers already run on Node by default (needed for mammoth/Buffer).

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Not signed in");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("BAD_REQUEST", "Expected multipart form data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorResponse("BAD_REQUEST", "File is required");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importDocument(user.id, {
      filename: file.name,
      size: file.size,
      buffer,
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return appErrorResponse(err);
    throw err;
  }
}
