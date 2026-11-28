import { NextRequest, NextResponse } from "next/server";
import { apiError, readJson } from "@/shared/auth/http";
import { apiBaseUrl, dataSource, getCurrentUser, SESSION_COOKIE } from "@/shared/auth/server";
import { mockOrderStore } from "../../mock-store";

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
  if (user.role !== "CLIENT") return apiError("FORBIDDEN", "Недостаточно прав", 403);
  const body = await readJson(request);
  const outcome = body?.outcome;
  if (outcome !== "SUCCESS" && outcome !== "FAILURE") return apiError("VALIDATION_ERROR", "Проверьте заполненные поля", 400);
  const { orderId } = await params;

  if (dataSource === "mock") {
    const stored = mockOrderStore.orders.get(orderId);
    if (!stored || stored.ownerId !== user.id) return apiError("ORDER_NOT_OWNER", "Заказ принадлежит другому пользователю", 404);
    if (stored.order.status === "PAID") {
      if (outcome === "SUCCESS") return NextResponse.json(stored.order);
      return apiError("PAYMENT_ALREADY_SUCCEEDED", "Заказ уже оплачен", 409);
    }
    if (stored.order.status !== "CREATED") return apiError("ORDER_NOT_PAYABLE", "Оплатить можно только заказ в статусе «Создан»", 409);
    const order = {
      ...stored.order,
      status: outcome === "SUCCESS" ? "PAID" as const : "CREATED" as const,
      updatedAt: new Date().toISOString(),
      payment: { status: outcome === "SUCCESS" ? "SUCCEEDED" as const : "FAILED" as const, amount: stored.order.total },
    };
    mockOrderStore.orders.set(orderId, { ...stored, order });
    return NextResponse.json(order);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const backend = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}/pay`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ outcome }),
    });
    return NextResponse.json(await backend.json(), { status: backend.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
