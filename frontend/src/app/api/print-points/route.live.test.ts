import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/shared/auth/server", () => ({
  apiBaseUrl: "http://127.0.0.1:3001/api",
  dataSource: "live",
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

describe("GET /api/print-points in live mode", () => {
  beforeEach(() => {
    auth.getCurrentUser.mockReset();
    auth.getCurrentUser.mockResolvedValue(null);
    vi.restoreAllMocks();
  });

  it("does not send an authorization header for a guest", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [], pagination: {} }), { status: 200 }),
    );

    await GET(new NextRequest("http://localhost/api/print-points"));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/print-points",
      { headers: undefined, cache: "no-store" },
    );
  });

  it("forwards the session token when it exists", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [], pagination: {} }), { status: 200 }),
    );
    const request = new NextRequest("http://localhost/api/print-points", {
      headers: { cookie: "copyhouse_session=session-token" },
    });

    await GET(request);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/api/print-points",
      { headers: { authorization: "Bearer session-token" }, cache: "no-store" },
    );
  });
});
