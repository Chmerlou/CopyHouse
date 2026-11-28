import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/shared/auth/http";
import { getCurrentUser, apiBaseUrl, dataSource, SESSION_COOKIE } from "@/shared/auth/server";
import type { ApiSchema } from "@/shared/api/contract";
import { mockOrderStore } from "@/app/api/orders/mock-store";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError("UNAUTHORIZED", "Требуется авторизация", 401);
  if (user.role !== "CLIENT") return apiError("FORBIDDEN", "Недостаточно прав", 403);

  const body = await request.formData();
  const file = body.get("file");
  if (!(file instanceof File)) {
    return apiError("VALIDATION_ERROR", "Приложите PDF-файл");
  }
  if (file.size > MAX_PDF_BYTES) {
    return apiError("FILE_TOO_LARGE", "Максимальный размер файла — 50 МБ", 413);
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return apiError("UNSUPPORTED_FILE_TYPE", "Поддерживается только PDF", 415);
  }

  if (dataSource === "mock") {
    if (!file.size) return apiError("EMPTY_PDF", "В документе нет страниц");
    const document = {
      id: randomUUID(),
      originalName: file.name,
      sizeBytes: file.size,
      pageCount: 12,
      createdAt: new Date().toISOString(),
    } satisfies ApiSchema<"Document">;
    mockOrderStore.documents.set(document.id, document);
    return NextResponse.json(document, { status: 201 });
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const upload = new FormData();
  upload.append("file", file);
  try {
    const backend = await fetch(`${apiBaseUrl}/documents`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: upload,
    });
    return NextResponse.json(await backend.json(), { status: backend.status });
  } catch {
    return apiError("INTERNAL_ERROR", "Не удалось выполнить операцию", 500);
  }
}
