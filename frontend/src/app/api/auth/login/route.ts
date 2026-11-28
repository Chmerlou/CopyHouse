import { NextRequest, NextResponse } from "next/server";
import type { ApiSchema } from "@/shared/api/contract";
import type { LoginInput, User } from "@/shared/auth/contracts";
import { validateLogin } from "@/shared/auth/contracts";
import { apiError, readJson } from "@/shared/auth/http";
import { loginMockAccount } from "@/shared/auth/mock-store";
import { signMockSession } from "@/shared/auth/mock-token";
import {
  apiBaseUrl,
  dataSource,
  MOCK_ACCOUNT_COOKIE,
  SESSION_COOKIE,
} from "@/shared/auth/server";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const input: LoginInput = {
    email: typeof body?.email === "string" ? body.email : "",
    password: typeof body?.password === "string" ? body.password : "",
  };
  if (Object.keys(validateLogin(input)).length) {
    return apiError("VALIDATION_ERROR", "Проверьте заполненные поля");
  }

  if (dataSource === "mock") {
    const user = loginMockAccount(input, request.cookies.get(MOCK_ACCOUNT_COOKIE)?.value);
    if (!user) return apiError("INVALID_CREDENTIALS", "Неверный email или пароль", 401);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, signMockSession(user), COOKIE_OPTIONS);
    return response;
  }

  try {
    const backend = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await backend.json() as ApiSchema<"AuthResponse"> | ApiSchema<"Error">;
    if (!backend.ok || !("accessToken" in body)) {
      return NextResponse.json(body, { status: backend.status });
    }
    const response = NextResponse.json({ user: body.user as User });
    response.cookies.set(SESSION_COOKIE, body.accessToken, COOKIE_OPTIONS);
    return response;
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
