import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/shared/auth/http";
import { apiBaseUrl, dataSource, getCurrentUser, SESSION_COOKIE } from "@/shared/auth/server";
import { mockOrderStore } from "../mock-store";

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
  if (user.role !== "CLIENT") return apiError("FORBIDDEN", "Недостаточно прав", 403);
  const { orderId } = await params;
  if (dataSource === "mock") {
    const stored = mockOrderStore.orders.get(orderId);
    if (!stored || stored.ownerId !== user.id) return apiError("ORDER_NOT_OWNER", "Заказ принадлежит другому пользователю", 404);
    return NextResponse.json(stored.order);
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const backend = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    return NextResponse.json(await backend.json(), { status: backend.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
