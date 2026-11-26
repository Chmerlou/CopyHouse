import { routes } from "@/shared/routes";

export type OrderQueueView = "active" | "completed";
export type ProviderView = OrderQueueView | "rates";

export function providerHref(view: ProviderView, page = 1, orderId?: string) {
  const query = new URLSearchParams();
  if (view !== "active") query.set("view", view);
  if (page > 1) query.set(view === "rates" ? "page" : "ordersPage", String(page));
  if (orderId) query.set("order", orderId);
  return query.size ? `${routes.provider}?${query}` : routes.provider;
}
