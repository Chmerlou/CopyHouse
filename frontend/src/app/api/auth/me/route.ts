import { NextResponse } from "next/server";
import { apiError } from "@/shared/auth/http";
import { getCurrentUser } from "@/shared/auth/server";

export async function GET() {
  const user = await getCurrentUser();
  return user
    ? NextResponse.json(user)
    : apiError("UNAUTHORIZED", "Требуется авторизация", 401);
}
