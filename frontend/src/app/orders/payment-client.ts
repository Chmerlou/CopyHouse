import type { ApiSchema } from "@/shared/api/contract";

export type PayOrder = (orderId: string, outcome: "SUCCESS" | "FAILURE") => Promise<ApiSchema<"OrderClient">>;

export const requestPayment: PayOrder = async (orderId, outcome) => {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ outcome }),
  });
  if (!response.ok) throw new Error("pay_order_failed");
  return response.json() as Promise<ApiSchema<"OrderClient">>;
};
