"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { orderStatusLabel } from "@/shared/order-status";
import { routes } from "@/shared/routes";
import { requestPayment, type PayOrder } from "../payment-client";
import styles from "../../order-flow.module.css";

type Order = ApiSchema<"OrderClient">;
export type LoadOrder = (orderId: string) => Promise<Order>;
export type { PayOrder } from "../payment-client";
const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2 });
const progress = ["PAID", "PRINTING", "READY", "ISSUED"] as const;
const titles: Record<Order["status"], string> = {
  CREATED: "Заказ оформлен",
  PAID: "Оплата прошла",
  PRINTING: "Заказ печатают",
  READY: "Заказ готов к выдаче",
  ISSUED: "Заказ выдан",
  CANCELLED: "Заказ отменён",
};
const nextStep: Record<Order["status"], string> = {
  CREATED: "После оплаты мы передадим заказ в копицентр.",
  PAID: "Заказ передан в копицентр. Код выдачи появится здесь, когда распечатки будут готовы.",
  PRINTING: "Копицентр печатает ваш файл. Код выдачи появится здесь, когда распечатки будут готовы.",
  READY: "Заберите заказ по указанному адресу и покажите сотруднику код выдачи.",
  ISSUED: "Детали заказа доступны в разделе «Мои заказы».",
  CANCELLED: "При необходимости оформите новый заказ в разделе «Мои заказы».",
};

async function requestOrder(orderId: string): Promise<Order> {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
  if (response.status === 401) throw new Error("session_expired");
  if (response.status === 403 || response.status === 404) throw new Error("order_unavailable");
  if (!response.ok) throw new Error("load_order_failed");
  return response.json() as Promise<Order>;
}
export function OrderView({ orderId, loadOrder = requestOrder, payOrder = requestPayment, paymentRetry = false }: {
  orderId: string;
  loadOrder?: LoadOrder;
  payOrder?: PayOrder;
  paymentRetry?: boolean;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payError, setPayError] = useState(paymentRetry);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const status = order?.status;
  const canRefresh = status === "PAID" || status === "PRINTING" || status === "READY";

  useEffect(() => {
    let active = true;
    loadOrder(orderId).then((value) => {
      if (!active) return;
      setOrder(value);
      setLoadError(null);
    }).catch((reason: unknown) => {
      if (!active) return;
      const error = reason instanceof Error ? reason.message : "load_order_failed";
      setLoadError(error);
      if (error === "session_expired" || error === "order_unavailable") setOrder(null);
    }).finally(() => {
      if (!active) return;
      setLoading(false);
      setRefreshing(false);
    });
    return () => { active = false; };
  }, [loadOrder, orderId, revision]);

  useEffect(() => {
    if (!canRefresh) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setRevision((value) => value + 1);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [canRefresh]);

  function refresh() {
    setRefreshing(true);
    setRevision((value) => value + 1);
  }

  async function pay() {
    if (paying) return;
    setPaying(true);
    setPayError(false);
    try { setOrder(await payOrder(orderId, "SUCCESS")); } catch { setPayError(true); }
    finally { setPaying(false); }
  }

  if (loading) return <section className={styles.card} aria-busy="true"><p>Загружаем заказ…</p></section>;
  if (!order) return (
    <section className={styles.card}>
      <h1>Заказ недоступен</h1>
      <p className={styles.lead} role="alert">
        {loadError === "session_expired" ? "Войдите снова, чтобы открыть заказ."
          : loadError === "order_unavailable" ? "Проверьте, есть ли этот заказ в вашем списке."
            : "Не удалось загрузить заказ. Повторите попытку."}
      </p>
      {loadError === "session_expired" ? (
        <Link className={styles.secondary} href={`${routes.login}?returnTo=${encodeURIComponent(routes.order(orderId))}`}>Войти</Link>
      ) : loadError !== "order_unavailable" ? (
        <button className={styles.secondary} type="button" disabled={refreshing} onClick={refresh}>
          {refreshing ? "Загружаем…" : "Повторить"}
        </button>
      ) : null}
      <Link className={styles.back} href={routes.accountOrders}>Мои заказы</Link>
    </section>
  );
  const needsPayment = order.status === "CREATED";
  const readyForPickup = order.status === "READY";
  const failed = needsPayment && order.payment?.status === "FAILED";
  const knownStatus = Object.hasOwn(titles, order.status);
  const stepIndex = progress.findIndex((step) => step === order.status);
  const description = failed ? "Повторите оплату, чтобы передать заказ в печать."
    : readyForPickup && !order.pickupCode ? "Код выдачи пока недоступен. Обновите статус, чтобы проверить его снова."
      : order.status === "CANCELLED" && order.payment?.status === "REFUNDED" ? "Тестовая оплата отменена. Деньги не списывались."
        : knownStatus ? nextStep[order.status] : "Обновите страницу позже, чтобы проверить заказ.";
  return (
    <section className={styles.card} aria-labelledby="order-title">
      <div aria-live="polite">
        <h1 id="order-title">{failed ? "Оплата не прошла" : knownStatus ? titles[order.status] : "Статус уточняется"}</h1>
        {readyForPickup && (
          <section className={styles.pickup} aria-label="Получение заказа">
            {order.pickupCode && <div className={styles.pickupCode}><span>Код выдачи</span><strong>{order.pickupCode}</strong></div>}
            <div className={styles.pickupPlace}>
              <strong>{order.printPoint.name}</strong>
              <span>{order.printPoint.city}, {order.printPoint.address}</span>
              {order.printPoint.workingHours && <span>Часы работы: {order.printPoint.workingHours}</span>}
            </div>
          </section>
        )}
        <p className={styles.lead}>{description}</p>
        {stepIndex >= 0 ? (
          <ol className={styles.progress} aria-label="Этапы заказа">
            {progress.map((step, index) => (
              <li key={step} data-reached={index <= stepIndex} aria-current={index === stepIndex ? "step" : undefined}>
                {step === "READY" ? "К выдаче" : orderStatusLabel(step)}
              </li>
            ))}
          </ol>
        ) : <p className={styles.status} data-status={order.status}>{orderStatusLabel(order.status)}</p>}
      </div>
      <dl className={styles.summary}>
        {!readyForPickup && <div><dt>Точка печати</dt><dd><strong>{order.printPoint.name}</strong><span>{order.printPoint.city}, {order.printPoint.address}</span></dd></div>}
        <div><dt>Файл</dt><dd>{order.document.originalName}</dd></div>
        <div><dt>Печать</dt><dd>{order.colorMode === "BW" ? "Чёрно-белая" : "Цветная"}, {order.copies} экз.</dd></div>
        <div className={styles.total}><dt>Итого</dt><dd>{money.format(order.total / 100)}</dd></div>
      </dl>
      {needsPayment ? <p className={styles.paymentNote}>Тестовая оплата. Деньги не спишутся.</p>
        : order.status === "PAID" ? <p className={styles.paymentNote}>Тестовая оплата прошла без списания денег.</p> : null}
      {needsPayment && payError ? <p className={styles.error} role="alert">Не удалось подтвердить оплату. Заказ сохранён, оплату можно повторить.</p> : null}
      {loadError ? <p className={styles.error} role="alert">Не удалось обновить статус. Показаны последние данные.</p> : null}
      {needsPayment ? <button className={styles.primary} type="button" disabled={paying} onClick={pay}>
        {paying ? "Подтверждаем оплату…" : payError ? "Повторить оплату" : "Оплатить заказ"}
      </button> : null}
      <div className={styles.orderActions}>
        <Link className={styles.back} href={routes.accountOrders}>Мои заказы</Link>
        {canRefresh ? (
          <button className={styles.refresh} type="button" disabled={refreshing} onClick={refresh}>
            {refreshing ? "Обновляем…" : "Обновить статус"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
