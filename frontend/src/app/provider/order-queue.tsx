import Link from "next/link";
import type { ApiSchema } from "@/shared/api/contract";
import { orderStatusLabel } from "@/shared/order-status";
import { pointRequest } from "../point-management/backend";
import { displayPrice } from "../point-management/price";
import { PointPagination, pointPageSize } from "../point-management/point-ui";
import { OrderActions } from "./order-actions";
import { providerHref, type OrderQueueView } from "./provider-links";
import shared from "../point-management/point-management.module.css";
import styles from "./provider-orders.module.css";

const date = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
});
type Order = ApiSchema<"OrderPoint">;

function printParameters(order: Order) {
  return `${order.colorMode === "COLOR" ? "Цветная" : "Чёрно-белая"} · ${order.pageCount} стр. × ${order.copies}`;
}

export async function OrderQueue({ point, page, view, orderId }: {
  point?: Pick<ApiSchema<"PrintPointOwner">, "id" | "address">;
  page: number;
  view: OrderQueueView;
  orderId: string | null;
}) {
  const href = providerHref(view, page);
  const detailHref = (id: string) => `${providerHref(view, page, id)}#order-details`;
  const query = new URLSearchParams({ printPointId: point?.id ?? "", page: String(page), limit: String(pointPageSize), queue: view });
  const [queue, details] = await Promise.all([
    point ? pointRequest<ApiSchema<"OrderPointList">>(`/point/orders?${query}`) : null,
    point && orderId ? pointRequest<Order>(`/point/orders/${orderId}`) : null,
  ]);
  const order = details?.ok && details.data.printPoint.id === point?.id ? details.data : null;

  return (
    <section id="incoming-orders" key={point?.id} className={styles.queue} aria-labelledby="incoming-orders-heading">
      <div className={shared.sectionHeading}>
        <h2 id="incoming-orders-heading">{view === "active" ? "Заказы в работе" : "Завершённые заказы"}</h2>
        {point && <p role="status">{point.address}</p>}
      </div>
      {details && (order ? <OrderDetails order={order} href={href} /> : (
        <div id="order-details" className={styles.notice}>
          <p role="alert">{!details.ok && details.status >= 500
            ? "Не удалось загрузить заказ. Попробуйте ещё раз."
            : "Заказ недоступен для выбранной точки."}</p>
          <Link className={shared.textLink} href={href}>К списку заказов</Link>
        </div>
      ))}
      {!queue ? <p className={styles.notice}>Выберите точку, чтобы увидеть её заказы.</p> : !queue.ok ? (
        <div className={styles.notice}>
          <p role="alert">Не удалось загрузить заказы точки.</p>
          <a href={href} className={shared.textLink}>Повторить загрузку</a>
        </div>
      ) : queue.data.items.length ? (
        <>
          <ul className={styles.mobileOrders} aria-label="Список заказов точки">
            {queue.data.items.map((item) => (
              <li key={item.id} data-selected={item.id === orderId}>
                <div className={styles.mobileOrderInfo}>
                  <strong>№ {item.id.slice(0, 8)}</strong>
                  <OrderStatus status={item.status} />
                </div>
                <Link className={styles.openOrder} prefetch={false} href={detailHref(item.id)}
                  aria-label={`Открыть заказ № ${item.id.slice(0, 8)}`}
                  aria-current={item.id === orderId ? "true" : undefined}>Открыть</Link>
              </li>
            ))}
          </ul>
          <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Таблица заказов точки">
            <table className={styles.table}>
              <thead><tr>
                <th scope="col">Заказ</th><th scope="col">Время (МСК)</th><th scope="col">Печать</th>
                <th scope="col">Сумма</th><th scope="col">Статус</th>
              </tr></thead>
              <tbody>
                {queue.data.items.map((item) => (
                  <tr key={item.id} data-selected={item.id === orderId}>
                    <th scope="row">
                      <Link className={shared.textLink} prefetch={false}
                        href={detailHref(item.id)}
                        aria-current={item.id === orderId ? "true" : undefined}>
                        № {item.id.slice(0, 8)}
                      </Link>
                    </th>
                    <td><time dateTime={item.createdAt}>{date.format(new Date(item.createdAt))}</time></td>
                    <td>{printParameters(item)}</td>
                    <td>{displayPrice(item.total)}</td>
                    <td><OrderStatus status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PointPagination href={href} page={page} totalPages={queue.data.pagination.totalPages}
            label="Страницы заказов точки" param="ordersPage" />
        </>
      ) : (
        <div className={styles.notice}>
          <p>{page > 1 ? "На этой странице нет заказов." : view === "active"
            ? "У этой точки пока нет заказов в работе." : "У этой точки пока нет завершённых заказов."}</p>
          {page > 1 && <Link className={shared.textLink} href={providerHref(view)}>К первой странице</Link>}
        </div>
      )}
    </section>
  );
}

function OrderStatus({ status }: { status: Order["status"] }) {
  return <span className={styles.orderStatus} data-status={status}>{orderStatusLabel(status)}</span>;
}

function OrderDetails({ order, href }: { order: Order; href: string }) {
  const canPrint = order.status === "PAID" || order.status === "PRINTING" || order.status === "READY";
  return (
    <section id="order-details" tabIndex={-1} className={`${shared.panel} ${styles.orderDetails}`} aria-labelledby="details-heading">
      <div className={styles.detailHeading}>
        <h3 id="details-heading">Заказ № {order.id.slice(0, 8)}</h3>
        <OrderStatus status={order.status} />
      </div>
      <dl className={styles.orderFacts}>
        <div><dt>Точка печати</dt><dd>{order.printPoint.address}</dd></div>
        <div><dt>Документ</dt><dd>{order.document.originalName}</dd></div>
        <div><dt>Параметры</dt><dd>{printParameters(order)}</dd></div>
        <div><dt>Сумма</dt><dd>{displayPrice(order.total)}</dd></div>
      </dl>
      <div className={styles.detailLinks}>
        {canPrint && <a className={shared.textLink} href={`/api/documents/${order.document.id}/file`}>Скачать PDF</a>}
        <Link className={shared.textLink} href={`${href}#incoming-orders`}>К списку заказов</Link>
      </div>
      <OrderActions key={order.id} orderId={order.id} status={order.status} />
    </section>
  );
}
