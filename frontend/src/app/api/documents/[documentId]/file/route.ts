import type { NextRequest } from "next/server";
import { apiError } from "@/shared/auth/http";
import { apiBaseUrl, dataSource, getCurrentUser, SESSION_COOKIE } from "@/shared/auth/server";
import { readPointId } from "@/app/point-management/backend";

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
  if (user.role !== "PrintProvider") return apiError("FORBIDDEN", "Недостаточно прав", 403);

  const documentId = readPointId((await params).documentId);
  if (!documentId || dataSource !== "live") return apiError("DOCUMENT_NOT_AVAILABLE", "Документ недоступен", 404);

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const backend = await fetch(`${apiBaseUrl}/documents/${documentId}/file`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (backend.status === 404) return apiError("DOCUMENT_NOT_AVAILABLE", "Документ недоступен", 404);
    if (backend.status === 401) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
    if (backend.status === 403) return apiError("FORBIDDEN", "Недостаточно прав", 403);
    if (backend.ok && backend.body) {
      return new Response(backend.body, {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": backend.headers.get("content-disposition") ?? "attachment; filename=document.pdf",
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
  } catch {
    // The same retry message covers a network error and a failed backend response.
  }
  return apiError("INTERNAL_ERROR", "Не удалось скачать PDF. Попробуйте ещё раз.", 502);
}
