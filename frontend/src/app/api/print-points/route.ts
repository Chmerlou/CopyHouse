import { NextRequest, NextResponse } from "next/server";
import type { ApiSchema } from "@/shared/api/contract";
import { printPointFixtures } from "@/shared/api/contract-fixtures";
import { apiError } from "@/shared/auth/http";
import { apiBaseUrl, dataSource, getCurrentUser, SESSION_COOKIE } from "@/shared/auth/server";

function positiveInteger(value: string | null, fallback: number, maximum?: number) {
  if (value === null) return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || (maximum !== undefined && number > maximum)) {
    return null;
  }
  return number;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);

  if (dataSource === "mock") {
    const page = positiveInteger(request.nextUrl.searchParams.get("page"), 1);
    const limit = positiveInteger(request.nextUrl.searchParams.get("limit"), 20, 100);
    const rawQuery = request.nextUrl.searchParams.get("q");
    const trimmedQuery = rawQuery?.trim() ?? "";
    if (page === null || limit === null || (rawQuery !== null && (!trimmedQuery || rawQuery.length > 200))) {
      return apiError("VALIDATION_ERROR", "Проверьте заполненные поля", 400);
    }
    const query = trimmedQuery.toLocaleLowerCase("ru");
    const city = user.city.trim().toLocaleLowerCase("ru");
    const available = printPointFixtures.filter((point) => {
      const matchesCity = point.city.trim().toLocaleLowerCase("ru") === city;
      const matchesQuery = !query || `${point.name} ${point.address}`.toLocaleLowerCase("ru").includes(query);
      return matchesCity && matchesQuery;
    });
    const start = (page - 1) * limit;
    const result = {
      items: available.slice(start, start + limit),
      pagination: {
        page,
        limit,
        totalItems: available.length,
        totalPages: Math.ceil(available.length / limit),
      },
    } satisfies ApiSchema<"PrintPointPublicList">;
    return NextResponse.json(result);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const backend = await fetch(`${apiBaseUrl}/print-points${request.nextUrl.search}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return NextResponse.json(await backend.json(), { status: backend.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
