import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ApiSchema } from "@/shared/api/contract";
import { routeForUser, type User } from "@/shared/auth/contracts";
import { apiBaseUrl, dataSource, getCurrentUser, SESSION_COOKIE } from "@/shared/auth/server";
import { routes } from "@/shared/routes";

type PointRole = Extract<User["role"], "ADMIN" | "PrintProvider">;

export function readPointId(value: FormDataEntryValue | null) {
  return typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
    ? value : null;
}

export async function requirePointPage(role: PointRole, href: string) {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`${routes.login}?${new URLSearchParams({ returnTo: href })}`);
  if (user.role !== role) redirect(routeForUser(user));
  return user;
}

export async function pointActionAccess(role: PointRole) {
  const user = await getCurrentUser();
  if (!user) return "Войдите в аккаунт снова.";
  if (user.role !== role) return "У вас нет доступа к этому действию.";
  if (dataSource !== "live") return "Это действие доступно при подключении к серверу.";
  return null;
}

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code?: ApiSchema<"ErrorCode"> };

export async function pointRequest<T>(path: string, init?: { method: "POST" | "PATCH"; body?: object }): Promise<Result<T>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, status: 401 };

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: init?.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    if (response.ok) return { ok: true, data: await response.json() as T };

    const error = await response.json().catch(() => null) as ApiSchema<"Error"> | null;
    return { ok: false, status: response.status, code: error?.code };
  } catch {
    return { ok: false, status: 503 };
  }
}

export function pointActionError(status: number, fallback: string) {
  if (status === 401) return "Сессия истекла. Войдите снова.";
  if (status === 403) return "У вас нет доступа к этой точке.";
  if (status === 404) return "Точка больше недоступна. Обновите страницу.";
  return fallback;
}
