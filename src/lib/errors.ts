export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL: 500,
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  options?: { status?: number; body?: Record<string, unknown> },
) {
  return Response.json(
    { error: { code, message }, ...(options?.body ?? {}) },
    { status: options?.status ?? STATUS_BY_CODE[code] },
  );
}

export function appErrorResponse(err: AppError) {
  return errorResponse(err.code, err.message, { body: err.extra });
}
