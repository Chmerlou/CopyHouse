"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { readPrintOptions, savePrintSettings, SELECTED_PRINT_POINT_KEY } from "@/shared/order-draft";
import { routes } from "@/shared/routes";
import styles from "./points.module.css";

type PrintPoint = ApiSchema<"PrintPointPublic">;
type PrintPointList = ApiSchema<"PrintPointPublicList">;
type OfferPoint = Omit<ApiSchema<"QuoteOffer">, "printPointId"> & { id: string };
type Quote = ApiSchema<"Quote">;
type CreateQuote = (input: ApiSchema<"QuoteRequest">) => Promise<Quote>;

export type ListPrintPoints = (city?: string) => Promise<PrintPoint[]>;

class PointRequestError extends Error {
  constructor(message: string, readonly signIn = false) {
    super(message);
  }
}

const requestQuote: CreateQuote = async (input) => {
  const response = await fetch("/api/quotes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 401) throw new PointRequestError("Войдите в аккаунт снова, чтобы получить цены.", true);
  if (!response.ok) throw new PointRequestError("Попробуйте рассчитать стоимость ещё раз.");
  return response.json();
};

async function requestPrintPointPage(page: number, city?: string): Promise<PrintPointList> {
  const query = new URLSearchParams({ page: String(page), limit: "100" });
  if (city) query.set("city", city);
  const response = await fetch(`/api/print-points?${query}`, { cache: "no-store" });
  if (response.status === 401) throw new PointRequestError("Войдите в аккаунт снова, чтобы открыть каталог.", true);
  if (response.status === 400 && city) throw new PointRequestError("Проверьте название города.");
  if (!response.ok) throw new PointRequestError("Попробуйте загрузить список ещё раз.");

  return response.json() as Promise<PrintPointList>;
}

export async function listPrintPoints(city?: string): Promise<PrintPoint[]> {
  const firstPage = await requestPrintPointPage(1, city);
  if (firstPage.pagination.totalPages <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from(
      { length: firstPage.pagination.totalPages - 1 },
      (_, index) => requestPrintPointPage(index + 2, city),
    ),
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.items);
}

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
});

export function PointSelector({
  listPrintPoints: requestPoints = listPrintPoints,
  selectable = true,
  continueHref,
  continueLabel = "Начать заказ",
  city,
  documentId,
  createQuote = requestQuote,
}: {
  listPrintPoints?: ListPrintPoints;
  selectable?: boolean;
  continueHref?: string;
  continueLabel?: string;
  city?: string;
  documentId?: string;
  createQuote?: CreateQuote;
}) {
  const [points, setPoints] = useState<Array<PrintPoint | OfferPoint>>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [missingPreferred, setMissingPreferred] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [error, setError] = useState<PointRequestError | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setStatus("loading");
      const options = documentId ? readPrintOptions(documentId) : null;
      if (documentId && !options) {
        setStatus("missing");
        return;
      }

      const nextQuote = options ? await createQuote(options) : null;
      if (options && nextQuote && (
        nextQuote.documentId !== options.documentId
        || nextQuote.colorMode !== options.colorMode
        || nextQuote.copies !== options.copies
      )) throw new PointRequestError("Не удалось получить цены для выбранных параметров. Повторите расчёт.");
      const result = nextQuote
        ? nextQuote.offers.map(({ printPointId, ...offer }) => ({ ...offer, id: printPointId }))
        : await requestPoints(city);
      if (!active) return;
      const storedId = selectable ? sessionStorage.getItem(SELECTED_PRINT_POINT_KEY) : null;
      const hasPreferred = result.some((point) => point.id === storedId);
      setPoints(result);
      setQuote(nextQuote);
      setSelectedId(hasPreferred ? storedId : null);
      setMissingPreferred(Boolean(documentId && storedId && !hasPreferred));
      setStatus("ready");
    }

    void load().catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof PointRequestError ? reason : null);
      setStatus("error");
    });

    return () => {
      active = false;
    };
  }, [city, createQuote, documentId, requestPoints, requestVersion, selectable]);

  function reload() {
    setStatus("loading");
    setRequestVersion((version) => version + 1);
  }

  function selectPoint(id: string) {
    setSelectedId(id);
    setMissingPreferred(false);
    sessionStorage.setItem(SELECTED_PRINT_POINT_KEY, id);
  }

  const selected = points.find((point) => point.id === selectedId);

  function saveSelection(event: { preventDefault(): void }) {
    if (!quote || !selected || !("total" in selected)) return;
    const options = readPrintOptions(quote.documentId);
    if (!options || options.colorMode !== quote.colorMode || options.copies !== quote.copies
      || Date.parse(quote.expiresAt) <= Date.now()) {
      event.preventDefault();
      reload();
      return;
    }
    savePrintSettings({
      documentId: quote.documentId,
      colorMode: quote.colorMode,
      copies: quote.copies,
      quoteId: quote.id,
      printPointId: selected.id,
      printPointName: selected.name,
      printPointAddress: selected.address,
      pricePerPage: selected.pricePerPage,
      total: selected.total,
      expiresAt: quote.expiresAt,
    });
  }

  if (status === "loading") {
    return (
      <div
        className={styles.skeletonList}
        role="status"
        aria-label={documentId ? "Рассчитываем цены" : "Загружаем точки печати"}
        aria-busy="true"
      >
        {[0, 1, 2].map((item) => <span key={item} />)}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.state} role="alert">
        <strong>{documentId ? "Не удалось рассчитать стоимость" : "Не удалось загрузить точки"}</strong>
        <p>{error?.message ?? "Попробуйте ещё раз."}</p>
        {error?.signIn ? (
          <Link href={`${routes.login}?${new URLSearchParams({ returnTo: documentId ? routes.orderPoints(documentId) : routes.points })}`}>
            Войти
          </Link>
        ) : <button type="button" onClick={reload}>Повторить</button>}
      </div>
    );
  }

  if (status === "missing" && documentId) {
    return (
      <div className={styles.state}>
        <strong>Сначала настройте печать</strong>
        <Link href={routes.configure(documentId)}>Указать параметры печати</Link>
      </div>
    );
  }

  if (!points.length) {
    return (
      <div className={styles.state} role="status">
        <strong>{documentId ? "Нет предложений для этих параметров" : "В вашем городе пока нет точек печати"}</strong>
        <p>{documentId ? "Попробуйте изменить цвет печати или число копий."
          : city ? "Проверьте название города или выберите другой." : "Попробуйте зайти позже."}</p>
        {documentId
          ? <Link href={routes.configure(documentId)}>Изменить параметры</Link>
          : city ? <Link href={routes.points}>Изменить город</Link>
            : <button type="button" onClick={reload}>Обновить список</button>}
      </div>
    );
  }

  const pointList = (
    <ul className={styles.pointList}>
      {points.map((point) => {
        const isSelected = point.id === selectedId;
        const details = (
          <>
            <span className={styles.pointMain}>
              <strong>{point.name}</strong>
              <span>{point.address}</span>
              <span className={styles.hours}>{point.workingHours}</span>
            </span>
            {"total" in point ? (
              <span className={styles.offerTotal}><small>За весь заказ</small>{money.format(point.total / 100)}</span>
            ) : (
              <span className={styles.prices}>
                <span><small>Ч/б страница</small>{money.format(point.pricePerPageBw / 100)}</span>
                <span><small>Цветная страница</small>{money.format(point.pricePerPageColor / 100)}</span>
              </span>
            )}
          </>
        );

        return (
          <li key={point.id}>
            {selectable ? (
              <label
                className={`${styles.point} ${isSelected ? styles.selected : ""}`}
              >
                <input
                  type="radio"
                  name="print-point"
                  value={point.id}
                  checked={isSelected}
                  onChange={() => selectPoint(point.id)}
                />
                {details}
                <span className={styles.choice}>{isSelected ? "Выбрано" : "Выбрать"}</span>
              </label>
            ) : (
              <article className={`${styles.point} ${styles.readOnly}`}>{details}</article>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (!selectable) {
    return <section className={styles.fieldset} aria-label="Точки печати">{pointList}</section>;
  }

  return (
    <>
      {quote ? (
        <p className={styles.orderContext}>
          {quote.city} · {quote.colorMode === "BW" ? "Чёрно-белая печать" : "Цветная печать"} · {quote.pageCount} стр. × {quote.copies} экз.
        </p>
      ) : null}
      {missingPreferred ? <p role="status">Выбранный ранее копицентр недоступен для этого заказа. Выберите другой.</p> : null}
      <fieldset className={styles.fieldset}>
        <legend className={styles.srOnly}>Выберите одну точку печати</legend>
        {pointList}
      </fieldset>
      {continueHref && (!documentId || selected) ? (
        <div className={`${styles.continueAction} ${selected ? styles.stickyAction : ""}`}>
          <span className={styles.selectionStatus} aria-live="polite">
            {selected ? <><strong>{selected.name}</strong>{"total" in selected ? ` · ${money.format(selected.total / 100)}` : " · Выбрано для заказа"}</> : "Можно выбрать копицентр заранее."}
          </span>
          <Link href={continueHref} onNavigate={saveSelection}>{continueLabel}</Link>
        </div>
      ) : null}
    </>
  );
}
