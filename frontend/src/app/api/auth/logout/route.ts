import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/shared/auth/server";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, "", { expires: new Date(0), path: "/" });
  return response;
}
