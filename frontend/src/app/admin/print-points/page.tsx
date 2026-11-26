import { Suspense } from "react";
import type { Metadata } from "next";
import type { ApiSchema } from "@/shared/api/contract";
import { dataSource } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { pointRequest, requirePointPage } from "../../point-management/backend";
import { PointLoadError, PointPagination, PointWorkspace, pointPageSize, readPointPage } from "../../point-management/point-ui";
import styles from "../../point-management/point-management.module.css";
import { PendingPoints } from "./pending-points";

export const metadata: Metadata = { title: "Заявки на подключение | CopyHouse" };
const title = "Заявки на подключение";
type SearchParams = Promise<{ page?: string | string[] }>;

async function AdminContent({ searchParams }: { searchParams: SearchParams }) {
  await requirePointPage("ADMIN", routes.adminPoints);
  const page = readPointPage((await searchParams).page);
  const result = dataSource === "live"
    ? await pointRequest<ApiSchema<"PrintPointAdminList">>(`/admin/print-points?status=PENDING&page=${page}&limit=${pointPageSize}`)
    : null;

  return (
    <PointWorkspace title={title} intro="Проверьте данные копицентра перед публикацией в каталоге.">
      {result?.ok ? (
        <>
          <PendingPoints points={result.data.items} page={page} total={result.data.pagination.totalItems} />
          {result.data.items.length ? (
            <PointPagination href={routes.adminPoints} page={page} totalPages={result.data.pagination.totalPages} label="Страницы заявок" />
          ) : null}
        </>
      ) : <PointLoadError href={routes.adminPoints} page={page} />}
    </PointWorkspace>
  );
}

export default function AdminPointsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PointWorkspace title={title}><p className={styles.loading} role="status">Загружаем заявки…</p></PointWorkspace>}>
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}
