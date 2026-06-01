// Standardized API response helpers
import { NextResponse } from "next/server";

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export function ok<T>(data: T, message?: string, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, ...(message ? { message } : {}) }, { status });
}

export function created<T>(data: T, message?: string): NextResponse<ApiSuccess<T>> {
  return ok(data, message, 201);
}

export function badRequest(error: string, code?: string): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error, ...(code ? { code } : {}) }, { status: 400 });
}

export function unauthorized(error = "Unauthorized"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 401 });
}

export function forbidden(error = "Forbidden"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 403 });
}

export function notFound(error = "Not found"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 404 });
}

export function conflict(error: string): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 409 });
}

export function serverError(error = "Internal server error"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status: 500 });
}

export function validationError(errors: Record<string, string[]>): NextResponse {
  return NextResponse.json({ success: false, error: "Validation failed", errors }, { status: 422 });
}
