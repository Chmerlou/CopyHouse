"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ApiSchema } from "@/shared/api/contract";
import { getCurrentUser, dataSource } from "@/shared/auth/server";
import { pointActionAccess, pointActionError, pointRequest, readPointId } from "../point-management/backend";
import { readPrice } from "../point-management/price";
import { providerPointCookie } from "./provider-data";
import { providerHref, type OrderQueueView } from "./provider-links";

export type PriceState = {
  message?: string;
  error?: string;
  fields?: Partial<Record<keyof ApiSchema<"PrintPointPrices">, string>>;
} | null;

export async function savePointPrices(_previous: PriceState, form: FormData): Promise<PriceState> {
  const accessError = await pointActionAccess("PrintProvider");
  if (accessError) return { error: accessError };

  const id = readPointId(form.get("pointId"));
  if (!id) {
    return { error: "Не удалось определить точку. Обновите страницу." };
  }

  const pricePerPageBw = readPrice(form.get("pricePerPageBw"));
  const pricePerPageColor = readPrice(form.get("pricePerPageColor"));
  if (pricePerPageBw === null || pricePerPageColor === null) {
    const invalidPrice = "Введите цену больше нуля, например 7,50.";
    return { fields: {
      pricePerPageBw: pricePerPageBw === null ? invalidPrice : undefined,
      pricePerPageColor: pricePerPageColor === null ? invalidPrice : undefined,
    } };
  }

  const result = await pointRequest<ApiSchema<"PrintPointOwner">>(`/print-points/${id}/prices`, {
    method: "PATCH",
    body: { pricePerPageBw, pricePerPageColor },
  });
  if (!result.ok) {
    return { error: pointActionError(result.status, "Не удалось сохранить тарифы. Попробуйте ещё раз.") };
  }

  refresh();
  return { message: result.data.status === "PENDING"
    ? "Тарифы сохранены. Точка на проверке."
    : "Тарифы сохранены." };
}

export async function selectProviderPoint(view: OrderQueueView, form: FormData) {
  const user = await getCurrentUser();
  const id = readPointId(form.get("pointId"));
  if (!user || user.role !== "PrintProvider" || dataSource !== "live" || !id) return;

  (await cookies()).set(providerPointCookie(user.id), id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/provider",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(providerHref(view === "completed" ? "completed" : "active"));
}

export type OrderActionState = { message?: string; error?: string; fieldError?: string } | null;

export async function changePointOrder(_previous: OrderActionState, form: FormData): Promise<OrderActionState> {
  const accessError = await pointActionAccess("PrintProvider");
  if (accessError) return { error: accessError };

  const id = readPointId(form.get("orderId"));
  const operation = form.get("operation");
  if (!id || (operation !== "start" && operation !== "ready" && operation !== "issue" && operation !== "cancel")) {
    return { error: "Не удалось определить действие. Обновите страницу." };
  }

  let body: ApiSchema<"IssueRequest"> | ApiSchema<"CancelOrderRequest"> | undefined;
  if (operation === "issue") {
    const code = form.get("code");
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return { fieldError: "Код выдачи должен состоять из 6 цифр" };
    }
    body = { code };
  } else if (operation === "cancel") {
    const value = form.get("reason");
    const reason = typeof value === "string" ? value.trim() : "";
    if (!reason || reason.length > 500) return { fieldError: "Укажите причину отмены (до 500 символов)." };
    body = { reason };
  }

  const result = await pointRequest<ApiSchema<"OrderPoint">>(`/point/orders/${id}/${operation}`, {
    method: "POST",
    body,
  });
  if (!result.ok) {
    if (result.status === 409) {
      refresh();
      return { error: "Заказ уже принят или изменён другим сотрудником" };
    }
    if (result.code === "INVALID_PICKUP_CODE") return { fieldError: "Неверный код выдачи" };
    if (result.status === 404) {
      refresh();
      return { error: "Заказ больше недоступен для этой точки." };
    }
    return { error: pointActionError(result.status, "Не удалось изменить заказ. Попробуйте ещё раз.") };
  }

  refresh();
  const messages = {
    start: "Заказ принят в печать.",
    ready: "Заказ готов к выдаче.",
    issue: "Заказ выдан.",
    cancel: "Заказ отменён.",
  };
  return { message: messages[operation] };
}
