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
  if (dataSource === "mock") {
    const user = await getCurrentUser();
    const page = positiveInteger(request.nextUrl.searchParams.get("page"), 1);
    const limit = positiveInteger(request.nextUrl.searchParams.get("limit"), 20, 100);
    const rawQuery = request.nextUrl.searchParams.get("q");
    const trimmedQuery = rawQuery?.trim() ?? "";
    if (page === null || limit === null || (rawQuery !== null && (!trimmedQuery || rawQuery.length > 200))) {
      return apiError("VALIDATION_ERROR", "Проверьте заполненные поля", 400);
    }
    const query = trimmedQuery.toLocaleLowerCase("ru");
    const city = (user?.city ?? request.nextUrl.searchParams.get("city"))?.trim().toLocaleLowerCase("ru") || null;
    const available = printPointFixtures.filter((point) => {
      const matchesCity = city === null || point.city.trim().toLocaleLowerCase("ru") === city;
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
  const url = `${apiBaseUrl}/print-points${request.nextUrl.search}`;
  try {
    let backend = await fetch(url, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    if (token && backend.status === 401) backend = await fetch(url, { cache: "no-store" });
    return NextResponse.json(await backend.json(), { status: backend.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
