import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { dataSource } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { readPointId, requirePointPage } from "../point-management/backend";
import { PointLoadError, PointPagination, PointWorkspace, pointPageSize, readPointPage } from "../point-management/point-ui";
import styles from "../point-management/point-management.module.css";
import orderStyles from "./provider-orders.module.css";
import { selectProviderPoint } from "./actions";
import { OrderQueue } from "./order-queue";
import { PointSwitcher } from "./point-switcher";
import { PointPrices } from "./point-prices";
import { listProviderPoints, providerPointCookie } from "./provider-data";
import { providerHref, type ProviderView } from "./provider-links";

export const metadata: Metadata = { title: "Панель точки | CopyHouse" };
const title = "Панель точки";
type SearchParams = Promise<{ page?: string | string[]; ordersPage?: string | string[]; order?: string | string[]; view?: string }>;
const tabs = { active: "В работе", completed: "Завершённые", rates: "Тарифы" } satisfies Record<ProviderView, string>;

async function ProviderContent({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePointPage("PrintProvider", routes.provider);
  const params = await searchParams;
  const view = params.view === "rates" || (!params.view && params.page) ? "rates"
    : params.view === "completed" ? "completed" : "active";
  const page = readPointPage(params.page);
  const orderPage = readPointPage(params.ordersPage);
  const orderId = readPointId(typeof params.order === "string" ? params.order : null);
  const result = dataSource === "live" ? await listProviderPoints() : null;
  if (!result) return (
    <PointWorkspace title={title}>
      <div className={styles.panel}><p>Заказы и тарифы доступны при подключении к серверу.</p></div>
    </PointWorkspace>
  );
  if (!result.ok) return (
    <PointWorkspace title={title}>
      <PointLoadError href={routes.provider} page={page} />
    </PointWorkspace>
  );

  const points = result.data;
  if (!points.length) return (
    <PointWorkspace title={title}><div className={styles.panel}><h2>У вас пока нет точек печати</h2></div></PointWorkspace>
  );
  const selectedId = (await cookies()).get(providerPointCookie(user.id))?.value;
  const point = points.find((item) => item.id === selectedId);
  const visibleRates = points.slice((page - 1) * pointPageSize, page * pointPageSize);

  return (
    <PointWorkspace title={title}>
      <nav className={orderStyles.tabs} aria-label="Разделы панели точки">
        {(Object.keys(tabs) as ProviderView[]).map((tab) => (
          <Link key={tab} aria-current={view === tab ? "page" : undefined} href={providerHref(tab)}>{tabs[tab]}</Link>
        ))}
      </nav>
      {view !== "rates" ? (
        <>
          <PointSwitcher points={points.map(({ id, address }) => ({ id, address }))}
            selectedId={point?.id} selectPoint={selectProviderPoint.bind(null, view)} />
          <Suspense fallback={<p className={orderStyles.notice} role="status">Загружаем заказы…</p>}>
            <OrderQueue point={point} page={orderPage} orderId={orderId} view={view} />
          </Suspense>
        </>
      ) : (
        <section aria-labelledby="point-rates-heading">
          <div className={styles.sectionHeading}>
            <h2 id="point-rates-heading">Тарифы печати</h2>
            {visibleRates.length > 0 && <p>Цена за страницу А4</p>}
          </div>
          {visibleRates.length > 0 ? (
            <>
              <ul className={styles.list}>
                {visibleRates.map((point) => <PointPrices key={point.id} point={point} />)}
              </ul>
              <PointPagination href={providerHref("rates")} page={page} totalPages={Math.ceil(points.length / pointPageSize)} label="Страницы точек" />
            </>
          ) : (
            <div className={styles.panel}>
              <h3>На этой странице нет точек</h3>
              <Link className={styles.textLink} href={providerHref("rates")}>К первой странице</Link>
            </div>
          )}
        </section>
      )}
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
