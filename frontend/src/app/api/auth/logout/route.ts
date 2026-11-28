import { clearSession } from "@/shared/auth/session-response";

export async function POST() {
  return clearSession();
}
