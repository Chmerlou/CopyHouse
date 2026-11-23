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
}));

import { GET } from "./route";

describe("GET /api/print-points", () => {
  beforeEach(() => auth.getCurrentUser.mockReset());

  it("requires an authenticated user", async () => {
    auth.getCurrentUser.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/print-points"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expect.objectContaining({
      code: "UNAUTHORIZED",
      message: "Требуется авторизация",
    }));
  });

  it("returns a paginated catalog for the profile city", async () => {
    auth.getCurrentUser.mockResolvedValue({
      id: "client-id",
      email: "client@copyhouse.test",
      role: "CLIENT",
      city: "Москва",
    });

    const response = await GET(new NextRequest("http://localhost/api/print-points?limit=2"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual(printPointFixtures.slice(0, 2));
    expect(body.pagination).toEqual({
      page: 1,
      limit: 2,
      totalItems: 5,
      totalPages: 3,
    });
  });

  it("returns an empty list when the profile city has no points", async () => {
    auth.getCurrentUser.mockResolvedValue({
      id: "client-id",
      email: "client@copyhouse.test",
      role: "CLIENT",
      city: "Калуга",
    });

    const response = await GET(new NextRequest("http://localhost/api/print-points"));

    expect(await response.json()).toEqual({
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0,
      },
    });
  });
});
