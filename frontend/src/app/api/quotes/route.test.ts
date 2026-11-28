import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { printPointFixtures } from "@/shared/api/contract-fixtures";

const auth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/shared/auth/server", () => ({
  apiBaseUrl: "http://127.0.0.1:3001/api",
  dataSource: "mock",
  getCurrentUser: auth.getCurrentUser,
  SESSION_COOKIE: "copyhouse_session",
}));

vi.mock("@/shared/auth/http", () => ({
  apiError: (code: string, message: string, status = 400) => NextResponse.json(
    { statusCode: status, code, message },
    { status },
  ),
  readJson: async (request: Request) => request.json(),
}));

import { POST } from "./route";

function quoteRequest(body: unknown) {
  return new NextRequest("http://localhost/api/quotes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/quotes", () => {
  beforeEach(() => {
    auth.getCurrentUser.mockReset();
    auth.getCurrentUser.mockResolvedValue({
      id: "client-id",
      email: "client@copyhouse.test",
      role: "CLIENT",
      city: "Москва",
    });
  });

  it("calculates an offer for every available point", async () => {
    const response = await POST(quoteRequest({
      documentId: "document-id",
      colorMode: "BW",
      copies: 2,
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(expect.objectContaining({
      documentId: "document-id",
      pageCount: 12,
      colorMode: "BW",
      copies: 2,
    }));
    expect(body.offers).toHaveLength(printPointFixtures.length);
    expect(body.offers[0]).toEqual(expect.objectContaining({
      printPointId: printPointFixtures[0].id,
      pricePerPage: 500,
      total: 12000,
    }));
  });

  it.each([0, 101, 1.5])("rejects invalid copies: %s", async (copies) => {
    const response = await POST(quoteRequest({
      documentId: "document-id",
      colorMode: "COLOR",
      copies,
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({
      code: "VALIDATION_ERROR",
    }));
  });
});
