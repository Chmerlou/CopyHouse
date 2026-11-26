// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { clientFixture, orderFixtures, uploadedDocumentFixture } from "@/shared/api/contract-fixtures";

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock("@/shared/auth/server", () => ({
  apiBaseUrl: "http://localhost:3000/api",
  dataSource: "live",
  getCurrentUser: auth.getCurrentUser,
  SESSION_COOKIE: "copyhouse_session",
  MOCK_ACCOUNT_COOKIE: "copyhouse_mock_account",
}));
vi.mock("@/shared/auth/http", () => ({
  apiError: (code: string, message: string, status: number) =>
    NextResponse.json({ code, message, statusCode: status }, { status }),
  readJson: (request: Request) => request.json(),
}));
vi.mock("@/shared/auth/mock-store", () => ({ loginMockAccount: vi.fn() }));
vi.mock("@/shared/auth/mock-token", () => ({ signMockSession: vi.fn() }));

import { POST as login } from "./auth/login/route";
import { POST as upload } from "./documents/route";
import { POST as quote } from "./quotes/route";
import { POST as createOrder } from "./orders/route";
import { GET as getOrder } from "./orders/[orderId]/route";
import { POST as payOrder } from "./orders/[orderId]/pay/route";

afterEach(() => vi.restoreAllMocks());

it("forwards login, PDF, quote, order and test payment to the backend", async () => {
  auth.getCurrentUser.mockResolvedValue(clientFixture);
  const document = { ...uploadedDocumentFixture, pageCount: 3 };
  const order = { ...orderFixtures[0], document, pageCount: 3 };
  const paid = { ...order, status: "PAID", payment: { status: "SUCCEEDED", amount: order.total } };
  const path = `/orders/${order.id}`;
  const key = "2ca645e3-a7e9-42af-80ff-e845d2d8bc18";
  const quoteRequest = { documentId: document.id, colorMode: "BW", copies: 1 };
  const orderRequest = { quoteId: "quote-from-backend", printPointId: order.printPoint.id };
  const backend = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const request = new Request(url, init);
    expect(new URL(request.url).origin).toBe("http://localhost:3000");
    const endpoint = new URL(request.url).pathname;
    if (endpoint === "/api/auth/login") {
      expect(await request.json()).toEqual({ email: clientFixture.email, password: "local-test-password" });
      return Response.json({ user: clientFixture, accessToken: "backend-token" });
    }
    expect(request.headers.get("authorization")).toBe("Bearer backend-token");
    if (endpoint === "/api/documents") {
      const file = (await request.formData()).get("file");
      expect(file).toBeInstanceOf(File);
      expect((file as File).name).toBe(document.originalName);
      return Response.json(document, { status: 201 });
    }
    if (endpoint === "/api/quotes") {
      expect(await request.json()).toEqual(quoteRequest);
      return Response.json({ id: orderRequest.quoteId }, { status: 201 });
    }
    if (endpoint === "/api/orders") {
      expect(request.headers.get("idempotency-key")).toBe(key);
      expect(await request.json()).toEqual(orderRequest);
      return Response.json(order, { status: 201 });
    }
    if (endpoint === `/api${path}/pay`) {
      expect(await request.json()).toEqual({ outcome: "SUCCESS" });
      return Response.json(paid);
    }
    expect(endpoint).toBe(`/api${path}`);
    expect(request.method).toBe("GET");
    return Response.json(paid);
  });

  const frontend = "http://localhost:3001/api";
  const session = await login(new NextRequest(`${frontend}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: clientFixture.email, password: "local-test-password" }),
  }));
  expect(await session.json()).toEqual({ user: clientFixture });
  expect(session.cookies.get("copyhouse_session")?.httpOnly).toBe(true);
  const headers = { cookie: `copyhouse_session=${session.cookies.get("copyhouse_session")?.value}` };
  const post = (endpoint: string, body: unknown, extraHeaders?: Record<string, string>) =>
    new NextRequest(`${frontend}${endpoint}`, {
      method: "POST", body: JSON.stringify(body), headers: { ...headers, ...extraHeaders },
    });

  const file = new FormData();
  file.set("file", new File(["PDF fixture"], document.originalName, { type: "application/pdf" }));
  const uploaded = await upload(new NextRequest(`${frontend}/documents`, { method: "POST", headers, body: file }));
  expect(uploaded.status).toBe(201);
  expect(await uploaded.json()).toEqual(document);
  expect(await (await quote(post("/quotes", quoteRequest))).json()).toEqual({ id: orderRequest.quoteId });
  expect((await createOrder(post("/orders", orderRequest, { "Idempotency-Key": key }))).status).toBe(201);
  const params = { params: Promise.resolve({ orderId: order.id }) };
  expect(await (await payOrder(post(`${path}/pay`, { outcome: "SUCCESS" }), params)).json()).toEqual(paid);
  expect(await (await getOrder(new NextRequest(`${frontend}${path}`, { headers }), params)).json()).toEqual(paid);
  expect(backend).toHaveBeenCalledTimes(6);
});

it("blocks a print provider from using client upload", async () => {
  auth.getCurrentUser.mockResolvedValue({ ...clientFixture, role: "PrintProvider" });
  const backend = vi.spyOn(globalThis, "fetch");
  const response = await upload(new NextRequest("http://localhost:3001/api/documents", { method: "POST" }));

  expect(response.status).toBe(403);
  expect(backend).not.toHaveBeenCalled();
});
