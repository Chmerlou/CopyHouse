import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { routeForUser } from "@/shared/auth/contracts";
import { apiBaseUrl, dataSource, getCurrentUser, SESSION_COOKIE } from "@/shared/auth/server";
import { orderStatusLabel } from "@/shared/order-status";
import { routes } from "@/shared/routes";
import { Button } from "@/shared/ui/ui";
import { mockOrderStore } from "../../api/orders/mock-store";
import styles from "../../order-flow.module.css";

const pageSize = 20;
const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" });
const date = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" });
const pageHref = (page: number) => page === 1 ? routes.accountOrders : `${routes.accountOrders}?page=${page}`;

async function loadOrders(userId: string, page: number): Promise<ApiSchema<"OrderClientList"> | null> {
  if (dataSource === "mock") {
    const orders = [...mockOrderStore.orders.values()]
      .filter(({ ownerId }) => ownerId === userId)
      .map(({ order }) => order)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      items: orders.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, limit: pageSize, totalItems: orders.length, totalPages: Math.ceil(orders.length / pageSize) },
    };
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${apiBaseUrl}/orders?page=${page}&limit=${pageSize}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok ? await response.json() as ApiSchema<"OrderClientList"> : null;
  } catch {
    return null;
  }
}

type SearchParams = Promise<{ page?: string | string[] }>;

async function OrdersContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const user = await getCurrentUser();
  const { page: rawPage } = await searchParams;
  const page = typeof rawPage === "string" && /^\d{1,4}$/.test(rawPage)
    ? Math.min(1000, Math.max(1, Number(rawPage))) : 1;
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(pageHref(page))}`);
  if (user.role !== "CLIENT") redirect(routeForUser(user));

  const result = await loadOrders(user.id, page);
  if (result && page > 1 && !result.items.length) redirect(routes.accountOrders);

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.historyHeading}>
          <div><h1>Мои заказы</h1><p>Откройте заказ, чтобы проверить статус или посмотреть код выдачи.</p></div>
          {result?.items.length ? <Link className={styles.historyNew} href={routes.upload}>Новый заказ</Link> : null}
        </div>
        {result === null ? (
          <div className={styles.card}>
            <p role="alert">Не удалось загрузить заказы.</p>
            <form action={routes.accountOrders}>
              <input type="hidden" name="page" value={page} />
              <Button type="submit" className={styles.historyNew}>Повторить</Button>
            </form>
          </div>
        ) : result.items.length ? (
          <>
            <ul className={styles.history}>
              {result.items.map((order) => (
                <li key={order.id}>
                  <Link className={styles.historyOrder} href={routes.order(order.id)}>
                    <span className={styles.historyDetails}>
                      <strong>{order.document.originalName}</strong>
                      <span>{order.printPoint.name} · {order.printPoint.address}</span>
                      <span>№ {order.id.slice(0, 8)} · <time dateTime={order.createdAt}>{date.format(new Date(order.createdAt))}</time></span>
                    </span>
                    <span className={styles.historyMeta}>
                      <span className={styles.status} data-status={order.status}>{orderStatusLabel(order.status)}</span>
                      <strong>{money.format(order.total / 100)}</strong>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {result.pagination.totalPages > 1 ? (
              <nav className={styles.historyPagination} aria-label="Страницы заказов">
                {page > 1 ? <Link href={pageHref(page - 1)}>Назад</Link> : null}
                <span>Страница {page} из {result.pagination.totalPages}</span>
                {page < result.pagination.totalPages && page < 1000 ? <Link href={pageHref(page + 1)}>Дальше</Link> : null}
              </nav>
            ) : null}
          </>
        ) : (
          <div className={styles.card}>
            <h2>У вас пока нет заказов</h2>
            <p className={styles.lead}>Загрузите PDF, чтобы сравнить цены и оформить печать.</p>
            <Link className={styles.historyNew} href={routes.upload}>Загрузить PDF</Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<main id="main-content" className={styles.page} aria-busy="true"><p>Загружаем заказы…</p></main>}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}
