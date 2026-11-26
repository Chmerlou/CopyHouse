export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  points: "/points",
  orderPoints: (documentId: string) => `/points?${new URLSearchParams({ documentId })}`,
  upload: "/upload",
  accountOrders: "/account/orders",
  settings: "/account/settings",
  provider: "/provider",
  adminPoints: "/admin/print-points",
  configure: (documentId: string) => `/configure/${documentId}`,
  checkout: (documentId: string) => `/checkout/${documentId}`,
  order: (orderId: string) => `/orders/${orderId}`,
} as const;

export function safeReturnTo(value: string | null, fallback = routes.upload) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
