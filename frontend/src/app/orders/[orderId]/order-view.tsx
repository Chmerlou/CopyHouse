"use client";

import { useEffect, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import styles from "../../order-flow.module.css";

type Order = ApiSchema<"OrderClient">;
export type LoadOrder = (orderId: string) => Promise<Order>;
export type PayOrder = (orderId: string, outcome: "SUCCESS" | "FAILURE") => Promise<Order>;
const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2 });

async function requestOrder(orderId: string): Promise<Order> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error("load_order_failed");
  return response.json() as Promise<Order>;
}
async function requestPayment(orderId: string, outcome: "SUCCESS" | "FAILURE"): Promise<Order> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pay`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ outcome }) });
  if (!response.ok) throw new Error("pay_order_failed");
  return response.json() as Promise<Order>;
}

export function OrderView({ orderId, loadOrder = requestOrder, payOrder = requestPayment }: { orderId: string; loadOrder?: LoadOrder; payOrder?: PayOrder }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    loadOrder(orderId).then((value) => { if (active) { setOrder(value); setLoading(false); } }).catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, [loadOrder, orderId]);

  async function pay() {
    if (paying) return;
    setPaying(true);
    setError(false);
    try { setOrder(await payOrder(orderId, "SUCCESS")); } catch { setError(true); }
    finally { setPaying(false); }
  }

  if (loading) return <section className={styles.card} aria-busy="true"><p>Загружаем заказ…</p></section>;
  if (!order) return <section className={styles.card}><p className={styles.error} role="alert">Нет соединения. Проверьте интернет и повторите попытку.</p></section>;
  const paid = order.status === "PAID";
  const failed = order.payment?.status === "FAILED";
  return (
    <section className={styles.card} aria-labelledby="order-title">
      <h1 id="order-title">{paid ? "Оплата прошла" : failed ? "Оплата не прошла" : "Заказ оформлен"}</h1>
      <p className={styles.lead}>{paid ? "Заказ ожидает печати." : failed ? "Заказ не оплачен. Можно повторить попытку." : "Перейдите к оплате, чтобы точка увидела заказ."}</p>
      <p role="status" className={`${styles.status} ${paid ? styles.statusPaid : ""}`}>{paid ? "Оплачен" : "Ожидает оплаты"}</p>
      <dl className={styles.summary}>
        <div><dt>Файл</dt><dd>{order.document.originalName}</dd></div>
        <div><dt>Точка печати</dt><dd><strong>{order.printPoint.name}</strong><span>{order.printPoint.address}</span></dd></div>
        <div><dt>Печать</dt><dd>{order.colorMode === "BW" ? "Чёрно-белая" : "Цветная"}, {order.copies} экз.</dd></div>
        <div className={styles.total}><dt>Итого</dt><dd>{money.format(order.total / 100)}</dd></div>
      </dl>
      {error ? <p className={styles.error} role="alert">Нет соединения. Проверьте интернет и повторите попытку.</p> : null}
      {!paid ? <button className={styles.primary} type="button" disabled={paying} onClick={pay}>{paying ? "Оплачиваем…" : "Оплатить (тест)"}</button> : null}
    </section>
  );
}
