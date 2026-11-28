import { type NextRequest } from "next/server";
import { apiError } from "@/shared/auth/http";
import { apiBaseUrl, dataSource, SESSION_COOKIE } from "@/shared/auth/server";
import { clearSession } from "@/shared/auth/session-response";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
  if (dataSource !== "live") {
    return apiError("VALIDATION_ERROR", "Выход со всех устройств доступен при подключении к серверу", 400);
  }

  try {
    const response = await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 204) return clearSession();
    if (response.status === 401) return apiError("UNAUTHORIZED", "Сессия истекла. Войдите снова.", 401);
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось связаться с сервером", 500);
  }
  return apiError("INTERNAL_ERROR", "Не удалось выйти со всех устройств", 500);
}
