"use server";

import { refresh } from "next/cache";
import type { ApiSchema } from "@/shared/api/contract";
import { pointActionAccess, pointActionError, pointRequest, readPointId } from "../point-management/backend";
import { readPrice } from "../point-management/price";

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
