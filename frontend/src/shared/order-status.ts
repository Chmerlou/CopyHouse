import type { ApiSchema } from "./api/contract";

type OrderStatus = ApiSchema<"OrderStatus">;

export const orderStatusLabels = {
  CREATED: "Ожидает оплаты",
  PAID: "Оплачен",
  PRINTING: "Печатается",
  READY: "Готов к выдаче",
  ISSUED: "Выдан",
  CANCELLED: "Отменён",
} satisfies Record<OrderStatus, string>;

export function orderStatusLabel(status: OrderStatus) {
  return Object.hasOwn(orderStatusLabels, status) ? orderStatusLabels[status] : "Статус уточняется";
}
