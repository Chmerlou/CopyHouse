import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { ApiSchema } from "@/shared/api/contract";
import { printPointFixtures } from "@/shared/api/contract-fixtures";
import { apiError, readJson } from "@/shared/auth/http";
import {
  apiBaseUrl,
  dataSource,
  getCurrentUser,
  SESSION_COOKIE,
} from "@/shared/auth/server";
import { mockOrderStore } from "@/app/api/orders/mock-store";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
  if (user.role !== "CLIENT") return apiError("FORBIDDEN", "Недостаточно прав", 403);

  const body = await readJson(request);
  const documentId = body?.documentId;
  const colorMode = body?.colorMode;
  const copies = body?.copies;
  if (
    typeof documentId !== "string"
    || !documentId.trim()
    || (colorMode !== "BW" && colorMode !== "COLOR")
    || !Number.isSafeInteger(copies)
    || Number(copies) < 1
    || Number(copies) > 100
  ) {
    return apiError("VALIDATION_ERROR", "Проверьте заполненные поля", 400);
  }

  if (dataSource === "mock") {
    const pageCount = 12;
    const city = user.city.trim().toLocaleLowerCase("ru");
    const offers = printPointFixtures
      .filter((point) => point.city.trim().toLocaleLowerCase("ru") === city)
      .map((point) => {
        const pricePerPage = colorMode === "BW"
          ? point.pricePerPageBw
          : point.pricePerPageColor;
        return {
          printPointId: point.id,
          name: point.name,
          city: point.city,
          address: point.address,
          workingHours: point.workingHours,
          pricePerPage,
          total: pageCount * Number(copies) * pricePerPage,
        };
      });
    const quote = {
      id: randomUUID(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      city: user.city,
      documentId,
      pageCount,
      colorMode,
      copies: Number(copies),
      offers,
    } satisfies ApiSchema<"Quote">;
    mockOrderStore.quotes.set(quote.id, { ownerId: user.id, quote });
    return NextResponse.json(quote, { status: 201 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const backend = await fetch(`${apiBaseUrl}/quotes`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ documentId, colorMode, copies }),
    });
    return NextResponse.json(await backend.json(), { status: backend.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
