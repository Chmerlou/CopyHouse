"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { readPendingDocuments, readPrintSettings } from "@/shared/order-draft";
import { routes } from "@/shared/routes";
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

export function CheckoutForm({ documentId, createOrder = requestOrder }: { documentId: string; createOrder?: CreateOrder }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const document = hydrated
    ? readPendingDocuments().find((item) => item.id === documentId) ?? null
    : null;
  const settings = hydrated ? readPrintSettings(documentId) : null;
  const attempt = useRef<{ quoteId: string; printPointId: string; key: string } | null>(null);
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

  const { quoteId, printPointId } = settings;
  const settingsId = `${quoteId}:${printPointId}`;
  const error = failure?.settingsId === settingsId ? failure.type : null;

  async function submit() {
    if (submitting || error === "recalculate") return;
    if (Date.parse(settings!.expiresAt) <= Date.now()) {
      setFailure({ settingsId, type: "recalculate" });
      return;
    }
    setSubmitting(true);
    setFailure(null);
    try {
      if (attempt.current?.quoteId !== quoteId || attempt.current.printPointId !== printPointId) {
        attempt.current = { quoteId, printPointId, key: crypto.randomUUID() };
      }
      const order = await createOrder({ quoteId, printPointId }, attempt.current.key);
      router.push(routes.order(order.id));
    } catch (reason) {
      setFailure({ settingsId, type: reason instanceof Error && quoteConflicts.has(reason.message) ? "recalculate" : "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="checkout-title">
      <h1 id="checkout-title">Проверьте заказ</h1>
      <p className={styles.lead}>Проверьте файл, параметры печати и адрес копицентра.</p>
      <dl className={styles.summary}>
        <div><dt>Файл</dt><dd>{document.originalName}</dd></div>
        <div><dt>Страниц</dt><dd>{document.pageCount}</dd></div>
        <div><dt>Точка печати</dt><dd><strong>{settings.printPointName}</strong><span>{settings.printPointAddress}</span></dd></div>
        <div><dt>Печать</dt><dd>{settings.colorMode === "BW" ? "Чёрно-белая" : "Цветная"}</dd></div>
        <div><dt>Копий</dt><dd>{settings.copies}</dd></div>
        <div><dt>Цена за страницу</dt><dd>{money.format(settings.pricePerPage / 100)}</dd></div>
        <div className={styles.total}><dt>Итого</dt><dd>{money.format(settings.total / 100)}</dd></div>
      </dl>
      <p className={styles.paymentNote}>Тестовая оплата. Деньги не спишутся.</p>
      {error === "error" ? <p className={styles.error} role="alert">Не удалось оформить заказ. Попробуйте ещё раз.</p> : null}
      {error === "recalculate" ? (
        <>
          <p className={styles.error} role="alert">Нужно обновить расчёт. Вернитесь к выбору точки, чтобы проверить цену и доступность.</p>
          <Link className={styles.secondary} href={routes.orderPoints(documentId)}>Пересчитать цены</Link>
        </>
      ) : (
        <button className={styles.primary} type="button" disabled={submitting} onClick={submit}>
          {submitting ? "Оформляем…" : error ? "Повторить" : "Оформить заказ"}
        </button>
      )}
    </section>
  );
}
