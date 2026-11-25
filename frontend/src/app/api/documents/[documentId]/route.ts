import { NextRequest, NextResponse } from "next/server";
import type { ApiSchema } from "@/shared/api/contract";
import { uploadedDocumentFixture } from "@/shared/api/contract-fixtures";
import { apiError } from "@/shared/auth/http";
import {
  apiBaseUrl,
  dataSource,
  getCurrentUser,
  SESSION_COOKIE,
} from "@/shared/auth/server";
import { mockOrderStore } from "@/app/api/orders/mock-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
  if (user.role !== "CLIENT") return apiError("FORBIDDEN", "Недостаточно прав", 403);

  const { documentId } = await params;
  if (!documentId) return apiError("VALIDATION_ERROR", "Проверьте адрес документа", 400);

  if (dataSource === "mock") {
    const document = mockOrderStore.documents.get(documentId) ?? {
      ...uploadedDocumentFixture,
      id: documentId,
    } satisfies ApiSchema<"Document">;
    return NextResponse.json(document);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const backend = await fetch(`${apiBaseUrl}/documents/${encodeURIComponent(documentId)}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return NextResponse.json(await backend.json(), { status: backend.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
