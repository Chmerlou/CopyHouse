"use server";

import { refresh } from "next/cache";
import type { ApiSchema } from "@/shared/api/contract";
import { pointActionAccess, pointActionError, pointRequest, readPointId } from "../../point-management/backend";

export type ApprovalState = { message: string; error?: true } | null;

export async function approvePoint(_previous: ApprovalState, form: FormData): Promise<ApprovalState> {
  const error = await pointActionAccess("ADMIN");
  if (error) return { error: true, message: error };

  const id = readPointId(form.get("pointId"));
  if (!id) {
    return { error: true, message: "Не удалось определить точку. Обновите страницу." };
  }

  const result = await pointRequest<ApiSchema<"PrintPointAdmin">>(`/admin/print-points/${id}/approve`, { method: "POST" });
  if (result.ok) {
    refresh();
    return { message: `«${result.data.name}» одобрена и доступна в каталоге.` };
  }
  if (result.code === "PRINT_POINT_NOT_PENDING") {
    refresh();
    return { error: true, message: "Эту заявку уже рассмотрели. Список обновлён." };
  }
  return { error: true, message: pointActionError(result.status, "Не удалось одобрить заявку. Попробуйте ещё раз.") };
}
