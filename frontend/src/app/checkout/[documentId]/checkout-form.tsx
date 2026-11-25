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

async function requestOrder(input: ApiSchema<"CreateOrderRequest">, idempotencyKey: string) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("create_order_failed");
  return response.json() as Promise<ApiSchema<"OrderClient">>;
}

export function CheckoutForm({ documentId, createOrder = requestOrder }: { documentId: string; createOrder?: CreateOrder }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const document = hydrated
    ? readPendingDocuments().find((item) => item.id === documentId) ?? null
    : null;
  const settings = hydrated ? readPrintSettings(documentId) : null;
  const idempotencyKey = useRef<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  if (!hydrated) {
    return <section className={styles.card} aria-busy="true"><p>Загружаем заказ…</p></section>;
  }

  if (!document || !settings) {
    return (
      <section className={styles.card} aria-labelledby="checkout-title">
        <h1 id="checkout-title">Не хватает данных заказа</h1>
        <p role="alert">Вернитесь к настройке файла и повторите расчёт.</p>
        <Link className={styles.secondary} href={routes.configure(documentId)}>Вернуться к настройке</Link>
      </section>
    );
  }

  async function submit() {
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      idempotencyKey.current ??= crypto.randomUUID();
      const order = await createOrder({ quoteId: settings!.quoteId, printPointId: settings!.printPointId }, idempotencyKey.current);
      router.push(routes.order(order.id));
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className={styles.card} aria-labelledby="checkout-title">
      <h1 id="checkout-title">Проверьте заказ</h1>
      <p className={styles.lead}>В заказ войдёт один PDF. После оформления его можно оплатить тестовой кнопкой.</p>
      <dl className={styles.summary}>
        <div><dt>Файл</dt><dd>{document.originalName}</dd></div>
        <div><dt>Страниц</dt><dd>{document.pageCount}</dd></div>
        <div><dt>Точка печати</dt><dd><strong>{settings.printPointName}</strong><span>{settings.printPointAddress}</span></dd></div>
        <div><dt>Печать</dt><dd>{settings.colorMode === "BW" ? "Чёрно-белая" : "Цветная"}</dd></div>
        <div><dt>Копий</dt><dd>{settings.copies}</dd></div>
        <div><dt>Цена за страницу</dt><dd>{money.format(settings.pricePerPage / 100)}</dd></div>
        <div className={styles.total}><dt>Итого</dt><dd>{money.format(settings.total / 100)}</dd></div>
      </dl>
      {status === "error" ? <p className={styles.error} role="alert">Нет соединения. Проверьте интернет и повторите попытку.</p> : null}
      <button className={styles.primary} type="button" disabled={status === "submitting"} onClick={submit}>
        {status === "error" ? "Повторить" : status === "submitting" ? "Оформляем…" : "Оформить заказ"}
      </button>
    </section>
  );
}
