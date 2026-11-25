import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("GET /api/documents/:documentId", () => {
  beforeEach(() => {
    auth.getCurrentUser.mockReset();
    auth.getCurrentUser.mockResolvedValue({
      id: "client-id",
      email: "client@copyhouse.test",
      role: "CLIENT",
      city: "Москва",
    });
  });

  it("returns document metadata for a direct configure URL", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/documents/document-id"),
      { params: Promise.resolve({ documentId: "document-id" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      id: "document-id",
      originalName: "lecture.pdf",
      pageCount: 12,
    }));
  });
});
