import "server-only";

import { NextResponse } from "next/server";
import type { ApiSchema } from "@/shared/api/contract";

export function apiError(code: ApiSchema<"ErrorCode">, message: string, status = 400) {
  return NextResponse.json({ statusCode: status, code, message }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}
