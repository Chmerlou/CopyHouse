import { NextRequest, NextResponse } from "next/server";
import type { RegisterInput } from "@/shared/auth/contracts";
import { validateRegistration } from "@/shared/auth/contracts";
import { apiError, readJson } from "@/shared/auth/http";
import { registerMockAccount } from "@/shared/auth/mock-store";
import { apiBaseUrl, dataSource, MOCK_ACCOUNT_COOKIE } from "@/shared/auth/server";

const ACCOUNT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if (body?.role !== "CLIENT" && body?.role !== "PrintProvider") {
    return apiError("VALIDATION_ERROR", "Проверьте заполненные поля");
  }
  const input: RegisterInput = {
    email: typeof body?.email === "string" ? body.email : "",
    password: typeof body?.password === "string" ? body.password : "",
    city: typeof body?.city === "string" ? body.city : "",
    role: body.role,
  };
  if (Object.keys(validateRegistration(input)).length) {
    return apiError("VALIDATION_ERROR", "Проверьте заполненные поля");
  }

  if (dataSource === "mock") {
    const result = registerMockAccount(
      input,
      request.cookies.get(MOCK_ACCOUNT_COOKIE)?.value,
    );
    if (!result) return apiError("EMAIL_ALREADY_USED", "Этот email уже используется", 409);
    const response = NextResponse.json(result.user, { status: 201 });
    response.cookies.set(MOCK_ACCOUNT_COOKIE, result.accountToken, ACCOUNT_COOKIE_OPTIONS);
    return response;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
