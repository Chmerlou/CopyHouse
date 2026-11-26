import "server-only";

import { cookies } from "next/headers";
import type { User } from "./contracts";
import { verifyMockSession } from "./mock-token";

export const SESSION_COOKIE = "copyhouse_session";
export const MOCK_ACCOUNT_COOKIE = "copyhouse_mock_account";
export const dataSource = process.env.COPYHOUSE_DATA_SOURCE === "live" ? "live" : "mock";
export const apiBaseUrl = process.env.COPYHOUSE_API_BASE_URL ?? "http://localhost:3000/api";

export async function getCurrentUser(): Promise<User | null> {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!session) return null;
  if (dataSource === "mock") return verifyMockSession(session);

  try {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: { authorization: `Bearer ${session}` },
      cache: "no-store",
    });
    return response.ok ? await response.json() as User : null;
  } catch {
    return null;
  }
}
