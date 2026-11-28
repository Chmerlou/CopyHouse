import "server-only";

import type { ApiSchema } from "@/shared/api/contract";
import { pointRequest } from "../point-management/backend";

export function providerPointCookie(userId: string) {
  return `copyhouse_provider_point_${userId}`;
}

export async function listProviderPoints() {
  const limit = 100;
  const first = await pointRequest<ApiSchema<"PrintPointOwnerList">>(`/print-points/mine?page=1&limit=${limit}`);
  if (!first.ok) return first;

  const points = new Map(first.data.items.map((point) => [point.id, point]));
  for (let page = 2; page <= Math.min(first.data.pagination.totalPages, 1000); page++) {
    const next = await pointRequest<ApiSchema<"PrintPointOwnerList">>(`/print-points/mine?page=${page}&limit=${limit}`);
    if (!next.ok) return next;
    for (const point of next.data.items) points.set(point.id, point);
  }
  return { ok: true, data: [...points.values()] } as const;
}
