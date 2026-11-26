import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ApiSchema } from "@/shared/api/contract";
import { dataSource } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { pointRequest, requirePointPage } from "../point-management/backend";
import { PointLoadError, PointPagination, PointWorkspace, pointPageSize, readPointPage } from "../point-management/point-ui";
import styles from "../point-management/point-management.module.css";
import { PointPrices } from "./point-prices";

export const metadata: Metadata = { title: "Панель точки | CopyHouse" };
const title = "Панель точки";
type SearchParams = Promise<{ page?: string | string[] }>;

async function ProviderContent({ searchParams }: { searchParams: SearchParams }) {
  await requirePointPage("PrintProvider", routes.provider);
  const page = readPointPage((await searchParams).page);
  const result = dataSource === "live"
    ? await pointRequest<ApiSchema<"PrintPointOwnerList">>(`/print-points/mine?page=${page}&limit=${pointPageSize}`)
    : null;

  return (
    <PointWorkspace title={title} intro="Управляйте тарифами своих точек печати.">
      <section aria-labelledby="point-rates-heading">
        <div className={styles.sectionHeading}>
          <h2 id="point-rates-heading">Тарифы печати</h2>
          {result?.ok && result.data.items.length ? <p>Цена за страницу А4</p> : null}
        </div>
        {result === null ? (
          <div className={styles.panel}><p>Тарифы доступны при подключении к серверу.</p></div>
        ) : !result.ok ? (
          <PointLoadError href={routes.provider} page={page} />
        ) : result.data.items.length ? (
          <>
            <ul className={styles.list}>
              {result.data.items.map((point) => <PointPrices key={point.id} point={point} />)}
            </ul>
            <PointPagination href={routes.provider} page={page} totalPages={result.data.pagination.totalPages} label="Страницы точек" />
          </>
        ) : (
          <div className={styles.panel}>
            <h3>{result.data.pagination.totalItems ? "На этой странице нет точек" : "У вас пока нет точек печати"}</h3>
            {result.data.pagination.totalItems ? <Link className={styles.textLink} href={routes.provider}>К списку точек</Link> : null}
          </div>
        )}
      </section>
    </PointWorkspace>
  );
}

export default function ProviderPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PointWorkspace title={title}><p className={styles.loading} role="status">Загружаем точки…</p></PointWorkspace>}>
      <ProviderContent searchParams={searchParams} />
    </Suspense>
  );
}
