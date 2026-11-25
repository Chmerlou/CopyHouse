import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { ApiSchema } from "@/shared/api/contract";
import { uploadedDocumentFixture } from "@/shared/api/contract-fixtures";
import { apiError, readJson } from "@/shared/auth/http";
import { apiBaseUrl, dataSource, getCurrentUser, SESSION_COOKIE } from "@/shared/auth/server";
import { mockOrderStore } from "./mock-store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
  if (user.role !== "CLIENT") return apiError("FORBIDDEN", "Недостаточно прав", 403);

  const body = await readJson(request);
  const quoteId = body?.quoteId;
  const printPointId = body?.printPointId;
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (typeof quoteId !== "string" || !quoteId || typeof printPointId !== "string" || !printPointId || !idempotencyKey || !UUID.test(idempotencyKey)) {
    return apiError("VALIDATION_ERROR", "Проверьте заполненные поля", 400);
  }

  const createBody = { quoteId, printPointId } satisfies ApiSchema<"CreateOrderRequest">;
  if (dataSource === "mock") {
    const bodyKey = JSON.stringify(createBody);
    const idempotencyId = `${user.id}:${idempotencyKey}`;
    const previous = mockOrderStore.idempotency.get(idempotencyId);
    if (previous) {
      if (previous.bodyKey !== bodyKey) return apiError("IDEMPOTENCY_KEY_MISMATCH", "Этот ключ уже использован для другого заказа", 409);
      return NextResponse.json(mockOrderStore.orders.get(previous.orderId)?.order, { status: 200 });
    }

    const storedQuote = mockOrderStore.quotes.get(quoteId);
    if (!storedQuote) return apiError("QUOTE_NOT_FOUND", "Расчёт не найден", 404);
    if (storedQuote.ownerId !== user.id) return apiError("QUOTE_NOT_OWNER", "Расчёт принадлежит другому пользователю", 404);
    const quote = storedQuote.quote;
    if (Date.parse(quote.expiresAt) <= Date.now()) return apiError("QUOTE_EXPIRED", "Расчёт устарел, запросите стоимость ещё раз", 409);
    if (quote.city.trim().toLocaleLowerCase("ru") !== user.city.trim().toLocaleLowerCase("ru")) return apiError("CITY_CHANGED", "Город в профиле изменился, запросите стоимость ещё раз", 409);
    const offer = quote.offers.find((item: ApiSchema<"QuoteOffer">) => item.printPointId === printPointId);
    if (!offer) return apiError("QUOTE_POINT_MISMATCH", "Выбранной точки нет в этом расчёте", 409);
    const document = mockOrderStore.documents.get(quote.documentId) ?? { ...uploadedDocumentFixture, id: quote.documentId };
    const now = new Date().toISOString();
    const order = {
      id: randomUUID(), status: "CREATED", createdAt: now, updatedAt: now,
      printPoint: { id: offer.printPointId, name: offer.name, city: offer.city, address: offer.address },
      document: { id: document.id, originalName: document.originalName, pageCount: quote.pageCount },
      colorMode: quote.colorMode, copies: quote.copies, pageCount: quote.pageCount,
      unitPrice: offer.pricePerPage, subtotal: offer.total, commissionBps: 0,
      commissionAmount: 0, total: offer.total, currency: "RUB", payment: null, pickupCode: null,
    } satisfies ApiSchema<"OrderClient">;
    mockOrderStore.orders.set(order.id, { ownerId: user.id, order });
    mockOrderStore.idempotency.set(idempotencyId, { bodyKey, orderId: order.id });
    return NextResponse.json(order, { status: 201 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const backend = await fetch(`${apiBaseUrl}/orders`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(createBody),
    });
    return NextResponse.json(await backend.json(), { status: backend.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
