import { NextRequest, NextResponse } from "next/server";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/shared/auth/server", () => ({
  apiBaseUrl: "http://localhost:3000/api",
  dataSource: "live",
  SESSION_COOKIE: "copyhouse_session",
}));
vi.mock("@/shared/auth/http", () => ({
  apiError: (code: string, message: string, status: number) =>
    NextResponse.json({ code, message, statusCode: status }, { status }),
}));

import { POST } from "./route";
import { POST as logoutHere } from "../route";

const request = () => new NextRequest("http://localhost:3001/api/auth/logout/all", {
  method: "POST",
  headers: { cookie: "copyhouse_session=session-token" },
});

afterEach(() => vi.restoreAllMocks());

it("terminates all sessions before clearing the local cookie", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  const response = await POST(request());

  expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { authorization: "Bearer session-token" },
  });
  expect(response.status).toBe(204);
  expect(response.cookies.get("copyhouse_session")?.value).toBe("");
});

it("keeps the local session when the server fails to terminate other sessions", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
  const response = await POST(request());

  expect(response.ok).toBe(false);
  expect(response.cookies.has("copyhouse_session")).toBe(false);
});

it("clears only the local cookie for a regular logout", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  const response = await logoutHere();

  expect(fetchMock).not.toHaveBeenCalled();
  expect(response.status).toBe(204);
  expect(response.cookies.get("copyhouse_session")?.value).toBe("");
});
