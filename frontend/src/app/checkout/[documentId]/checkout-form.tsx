"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { readCheckoutAttempt, readPendingDocuments, readPrintSettings, saveCheckoutAttempt } from "@/shared/order-draft";
import { routes } from "@/shared/routes";
import { requestPayment, type PayOrder } from "../../orders/payment-client";
import styles from "../../order-flow.module.css";

export type CreateOrder = (
  input: ApiSchema<"CreateOrderRequest">,
  idempotencyKey: string,
) => Promise<Pick<ApiSchema<"OrderClient">, "id">>;

const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2 });
const subscribeToHydration = () => () => {};
const quoteConflicts = new Set([
  "QUOTE_EXPIRED", "QUOTE_NOT_FOUND", "QUOTE_POINT_MISMATCH", "CITY_CHANGED", "PRICE_CHANGED",
  "PRINT_POINT_NOT_FOUND", "PRINT_POINT_NOT_APPROVED", "PRINT_POINT_INACTIVE", "TARIFF_MISSING",
]);

async function requestOrder(input: ApiSchema<"CreateOrderRequest">, idempotencyKey: string) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { code?: string } | null;
    throw new Error(error?.code ?? "create_order_failed");
  }
  return response.json() as Promise<ApiSchema<"OrderClient">>;
}

export function CheckoutForm({ documentId, createOrder = requestOrder, payOrder = requestPayment }: {
  documentId: string;
  createOrder?: CreateOrder;
  payOrder?: PayOrder;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const document = hydrated
    ? readPendingDocuments().find((item) => item.id === documentId) ?? null
    : null;
  const settings = hydrated ? readPrintSettings(documentId) : null;
  const attempt = useRef<{ settingsId: string; key: string; orderId?: string } | null>(null);
  const locked = useRef(false);
  const [failure, setFailure] = useState<{ settingsId: string; type: "error" | "recalculate" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!hydrated) {
    return <section className={styles.card} aria-busy="true"><p>Загружаем заказ…</p></section>;
  }

  if (!document || !settings) {
    return (
      <section className={styles.card} aria-labelledby="checkout-title">
        <h1 id="checkout-title">Выберите копицентр</h1>
        <p role="alert">Вернитесь к списку точек, чтобы выбрать копицентр и проверить цену.</p>
        <Link className={styles.secondary} href={routes.orderPoints(documentId)}>Вернуться к выбору точки</Link>
      </section>
    );
  }

  const { quoteId, printPointId, expiresAt } = settings;
  const settingsId = `${quoteId}:${printPointId}`;
  const error = failure?.settingsId === settingsId ? failure.type : null;

  async function submit() {
    if (locked.current || error === "recalculate") return;
    const saved = attempt.current?.settingsId === settingsId ? attempt.current : readCheckoutAttempt(quoteId, printPointId);
    if (!saved?.orderId && Date.parse(expiresAt) <= Date.now()) {
      setFailure({ settingsId, type: "recalculate" });
      return;
    }
    locked.current = true;
    setSubmitting(true);
    setFailure(null);
    const current = { settingsId, key: saved?.key ?? crypto.randomUUID(), orderId: saved?.orderId };
    attempt.current = current;
    saveCheckoutAttempt(quoteId, printPointId, current);
    let orderId: string;
    try {
      orderId = current.orderId ?? (await createOrder({ quoteId, printPointId }, current.key)).id;
    } catch (reason) {
      setFailure({ settingsId, type: reason instanceof Error && quoteConflicts.has(reason.message) ? "recalculate" : "error" });
      locked.current = false;
      setSubmitting(false);
      return;
    }
    current.orderId = orderId;
    saveCheckoutAttempt(quoteId, printPointId, current);
    let destination = routes.order(orderId);
    try {
      await payOrder(orderId, "SUCCESS");
    } catch {
      destination += "?payment=retry";
    }
    router.push(destination);
  }

  return (
    <section className={`${styles.card} ${styles.checkoutCard}`} aria-labelledby="checkout-title">
      <h1 id="checkout-title">Проверьте заказ</h1>
      <dl className={styles.summary}>
        <div><dt>Файл</dt><dd><strong>{document.originalName}</strong><span>{document.pageCount} стр.</span></dd></div>
        <div><dt>Точка печати</dt><dd><strong>{settings.printPointName}</strong><span>{settings.printPointAddress}</span></dd></div>
        <div><dt>Печать</dt><dd><strong>{settings.colorMode === "BW" ? "Чёрно-белая" : "Цветная"}, {settings.copies} экз.</strong>
          <span>{money.format(settings.pricePerPage / 100)} за страницу</span></dd></div>
      </dl>
      <div className={styles.checkoutBar}>
        <dl className={styles.checkoutTotal}><div className={styles.total}><dt>Итого</dt><dd>{money.format(settings.total / 100)}</dd></div></dl>
        <p className={styles.paymentNote} id="checkout-payment-note">Тестовая оплата. Деньги не спишутся.</p>
        {error === "error" ? <p className={styles.error} role="alert">Не удалось оформить заказ. Попробуйте ещё раз.</p> : null}
        {error === "recalculate" ? (
          <>
            <p className={styles.error} role="alert">Нужно обновить расчёт. Вернитесь к выбору точки, чтобы проверить цену и доступность.</p>
            <Link className={styles.secondary} href={routes.orderPoints(documentId)}>Пересчитать цены</Link>
          </>
        ) : (
          <button className={styles.primary} type="button" disabled={submitting} onClick={submit} aria-describedby="checkout-payment-note">
            {submitting ? "Подтверждаем…" : error ? "Повторить" : "Подтвердить и оплатить"}
          </button>
        )}
      </div>
    </section>
  );
}
