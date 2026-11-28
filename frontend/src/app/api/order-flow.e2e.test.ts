import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/shared/auth/server", () => ({ apiBaseUrl: "http://backend/api", dataSource: "mock", getCurrentUser: auth.getCurrentUser, SESSION_COOKIE: "copyhouse_session" }));
vi.mock("@/shared/auth/http", () => ({
  apiError: (code: string, message: string, status = 400) => NextResponse.json({ statusCode: status, code, message }, { status }),
  readJson: async (request: Request) => request.json(),
}));

import { POST as quote } from "./quotes/route";
import { POST as createOrder } from "./orders/route";
import { POST as payOrder } from "./orders/[orderId]/pay/route";
import { resetMockOrderStore } from "./orders/mock-store";

function post(url: string, body: unknown, headers?: HeadersInit) {
  return new NextRequest(url, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });
}

describe("mock order flow e2e", () => {
  beforeEach(() => {
    resetMockOrderStore();
    auth.getCurrentUser.mockResolvedValue({ id: "client-one", email: "client@copyhouse.test", role: "CLIENT", city: "Москва" });
  });

  it("goes from quote through one-file order to paid", async () => {
    const quoteResponse = await quote(post("http://localhost/api/quotes", { documentId: "document-one", colorMode: "BW", copies: 1 }));
    const calculated = await quoteResponse.json();
    const key = "2ca645e3-a7e9-42af-80ff-e845d2d8bc18";
    const orderResponse = await createOrder(post("http://localhost/api/orders", { quoteId: calculated.id, printPointId: calculated.offers[0].printPointId }, { "Idempotency-Key": key }));
    const order = await orderResponse.json();
    const duplicateResponse = await createOrder(post("http://localhost/api/orders", { quoteId: calculated.id, printPointId: calculated.offers[0].printPointId }, { "Idempotency-Key": key }));
    const paidResponse = await payOrder(post(`http://localhost/api/orders/${order.id}/pay`, { outcome: "SUCCESS" }), { params: Promise.resolve({ orderId: order.id }) });
    const paid = await paidResponse.json();

    expect(orderResponse.status).toBe(201);
    expect(duplicateResponse.status).toBe(200);
    expect((await duplicateResponse.json()).id).toBe(order.id);
    expect(paid).toEqual(expect.objectContaining({ id: order.id, status: "PAID", payment: { status: "SUCCEEDED", amount: 6000 } }));
  });

  it("keeps failed payment retryable", async () => {
    const calculated = await (await quote(post("http://localhost/api/quotes", { documentId: "document-one", colorMode: "BW", copies: 1 }))).json();
    const order = await (await createOrder(post("http://localhost/api/orders", { quoteId: calculated.id, printPointId: calculated.offers[0].printPointId }, { "Idempotency-Key": "71f5c688-4d2e-4380-a2a2-20cfc52af1c8" }))).json();
    const failed = await (await payOrder(post(`http://localhost/api/orders/${order.id}/pay`, { outcome: "FAILURE" }), { params: Promise.resolve({ orderId: order.id }) })).json();
    const paid = await (await payOrder(post(`http://localhost/api/orders/${order.id}/pay`, { outcome: "SUCCESS" }), { params: Promise.resolve({ orderId: order.id }) })).json();
    expect(failed).toEqual(expect.objectContaining({ status: "CREATED", payment: { status: "FAILED", amount: 6000 } }));
    expect(paid.status).toBe("PAID");
  });

  it("does not let another client create an order from a foreign quote", async () => {
    const calculated = await (await quote(post("http://localhost/api/quotes", { documentId: "document-one", colorMode: "BW", copies: 1 }))).json();
    auth.getCurrentUser.mockResolvedValue({ id: "client-two", email: "other@copyhouse.test", role: "CLIENT", city: "Москва" });
    const response = await createOrder(post("http://localhost/api/orders", { quoteId: calculated.id, printPointId: calculated.offers[0].printPointId }, { "Idempotency-Key": "b456ec6d-5877-430c-986b-e7346a81198a" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(expect.objectContaining({ code: "QUOTE_NOT_OWNER" }));
  });
});
