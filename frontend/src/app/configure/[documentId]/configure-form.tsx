"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import {
  readPendingDocuments,
  readPrintSettings,
  savePendingDocuments,
  savePrintSettings,
  SELECTED_PRINT_POINT_KEY,
} from "@/shared/order-draft";
import { routes } from "@/shared/routes";
import styles from "./configure.module.css";

type Document = ApiSchema<"Document">;
type Quote = ApiSchema<"Quote">;
type QuoteRequest = ApiSchema<"QuoteRequest">;
type ColorMode = ApiSchema<"ColorMode">;

export type CreateQuote = (input: QuoteRequest) => Promise<Quote>;
export type LoadDocument = (documentId: string) => Promise<Document>;

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
});
const subscribeToHydration = () => () => {};

async function requestQuote(input: QuoteRequest): Promise<Quote> {
  const response = await fetch("/api/quotes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("quote_failed");
  return response.json() as Promise<Quote>;
}

async function requestDocument(documentId: string): Promise<Document> {
  const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("document_failed");
  return response.json() as Promise<Document>;
}

export function ConfigureForm({
  documentId,
  createQuote = requestQuote,
  loadDocument = requestDocument,
}: {
  documentId: string;
  createQuote?: CreateQuote;
  loadDocument?: LoadDocument;
}) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [document, setDocument] = useState<Document | null>(null);
  const [documentError, setDocumentError] = useState(false);
  const [selectedColorMode, setSelectedColorMode] = useState<ColorMode | null>(null);
  const [selectedCopies, setSelectedCopies] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retryKey, setRetryKey] = useState(0);
  const storedDocument = hydrated
    ? readPendingDocuments().find((item) => item.id === documentId) ?? null
    : null;
  const storedSettings = hydrated ? readPrintSettings(documentId) : null;
  const visibleDocument = document ?? storedDocument;
  const colorMode = selectedColorMode ?? storedSettings?.colorMode ?? "BW";
  const copiesInput = selectedCopies ?? String(storedSettings?.copies ?? 1);
  const selectedPointId = hydrated ? sessionStorage.getItem(SELECTED_PRINT_POINT_KEY) : null;

  const copies = Number(copiesInput);
  const copiesValid = Number.isSafeInteger(copies) && copies >= 1 && copies <= 100;
  const quoteIsCurrent = quote?.documentId === documentId
    && quote.colorMode === colorMode
    && quote.copies === copies;
  const selectedOffer = quoteIsCurrent
    ? quote.offers.find((offer) => offer.printPointId === selectedPointId) ?? null
    : null;

  useEffect(() => {
    if (!hydrated || storedDocument) return;
    let active = true;
    loadDocument(documentId)
      .then((result) => {
        if (!active) return;
        savePendingDocuments([result]);
        setDocument(result);
      })
      .catch(() => active && setDocumentError(true));
    return () => { active = false; };
  }, [documentId, hydrated, loadDocument, storedDocument]);

  useEffect(() => {
    if (!hydrated || !copiesValid || !selectedPointId) return;

    let active = true;
    const timer = window.setTimeout(() => {
      setQuoteStatus("loading");
      createQuote({ documentId, colorMode, copies })
        .then((result) => {
          if (!active) return;
          setQuote(result);
          setQuoteStatus("ready");
        })
        .catch(() => {
          if (!active) return;
          setQuote(null);
          setQuoteStatus("error");
        });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [colorMode, copies, copiesValid, createQuote, documentId, hydrated, retryKey, selectedPointId]);

  function persistSettings() {
    if (!quote || !selectedOffer || !selectedPointId) return;
    savePrintSettings({
      documentId,
      colorMode,
      copies,
      quoteId: quote.id,
      printPointId: selectedPointId,
      printPointName: selectedOffer.name,
      printPointAddress: selectedOffer.address,
      pricePerPage: selectedOffer.pricePerPage,
      total: selectedOffer.total,
      expiresAt: quote.expiresAt,
    });
  }

  return (
    <section className={styles.workspace} aria-labelledby="configure-title">
      <div className={styles.heading}>
        <h1 id="configure-title">Настройте печать</h1>
        <p>Выберите режим и количество копий. Стоимость обновится автоматически.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.formPanel}>
          <div className={styles.documentRow}>
            <span className={styles.fileMark} aria-hidden="true">PDF</span>
            <div>
              <strong>{visibleDocument?.originalName ?? (documentError ? "Не удалось загрузить файл" : "Загружаем файл…")}</strong>
              {visibleDocument ? <span>{visibleDocument.pageCount} стр.</span> : null}
            </div>
          </div>

          {documentError ? (
            <p className={styles.inlineError} role="alert">
              Обновите страницу или вернитесь к загрузке файла.
            </p>
          ) : null}

          <fieldset className={styles.fieldset}>
            <legend>Цвет печати</legend>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="colorMode"
                value="BW"
                aria-label="Чёрно-белая"
                checked={colorMode === "BW"}
                onChange={() => {
                  setSelectedColorMode("BW");
                }}
              />
              <span><strong>Чёрно-белая</strong><small>Для текста и конспектов</small></span>
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="colorMode"
                value="COLOR"
                aria-label="Цветная"
                checked={colorMode === "COLOR"}
                onChange={() => {
                  setSelectedColorMode("COLOR");
                }}
              />
              <span><strong>Цветная</strong><small>Для изображений и презентаций</small></span>
            </label>
          </fieldset>

          <div className={styles.field}>
            <label htmlFor="copies">Количество копий</label>
            <input
              id="copies"
              type="number"
              min="1"
              max="100"
              step="1"
              inputMode="numeric"
              value={copiesInput}
              aria-invalid={!copiesValid}
              aria-describedby="copies-hint"
              onChange={(event) => {
                setSelectedCopies(event.target.value);
              }}
            />
            <small id="copies-hint" className={!copiesValid ? styles.invalidHint : undefined}>
              Целое число от 1 до 100.
            </small>
          </div>
        </div>

        <aside className={styles.summary} aria-live="polite">
          <p className={styles.summaryLabel}>Расчёт</p>
          {!selectedPointId ? (
            <div className={styles.summaryState}>
              <strong>Точка не выбрана</strong>
              <p>Выберите точку печати, чтобы увидеть стоимость.</p>
              <Link href={`${routes.points}?documentId=${encodeURIComponent(documentId)}`}>
                Выбрать точку
              </Link>
            </div>
          ) : null}
          {selectedPointId && quoteStatus !== "error" && (!copiesValid || !quoteIsCurrent || quoteStatus === "idle" || quoteStatus === "loading") ? (
            <div className={styles.summaryState} aria-busy={quoteStatus === "loading"}>
              <strong>{!copiesValid ? "Проверьте количество" : "Считаем стоимость…"}</strong>
              <p>{!copiesValid ? "Укажите целое число от 1 до 100." : "Это займёт несколько секунд."}</p>
            </div>
          ) : null}
          {copiesValid && quoteStatus === "error" ? (
            <div className={styles.summaryState}>
              <p className={styles.quoteError} role="alert">
                Нет соединения. Проверьте интернет и повторите попытку.
              </p>
              <button type="button" onClick={() => {
                setRetryKey((value) => value + 1);
              }}>
                Повторить расчёт
              </button>
            </div>
          ) : null}
          {copiesValid && quoteIsCurrent && quoteStatus === "ready" && !selectedOffer ? (
            <div className={styles.summaryState}>
              <strong>Нет предложений</strong>
              <p>Для выбранной точки сейчас нельзя рассчитать печать с этими параметрами.</p>
              <Link href={`${routes.points}?documentId=${encodeURIComponent(documentId)}`}>
                Изменить параметры
              </Link>
            </div>
          ) : null}
          {copiesValid && quoteIsCurrent && quoteStatus === "ready" && quote && selectedOffer ? (
            <>
              <div className={styles.pointInfo}>
                <strong>{selectedOffer.name}</strong>
                <span>{selectedOffer.address}</span>
              </div>
              <dl className={styles.breakdown}>
                <div><dt>Цена за страницу</dt><dd>{money.format(selectedOffer.pricePerPage / 100)}</dd></div>
                <div><dt>Страниц</dt><dd>{quote.pageCount}</dd></div>
                <div><dt>Копий</dt><dd>{quote.copies}</dd></div>
                <div className={styles.total}><dt>Итого</dt><dd>{money.format(selectedOffer.total / 100)}</dd></div>
              </dl>
              <Link
                className={styles.primaryAction}
                href={routes.checkout(documentId)}
                onClick={persistSettings}
              >
                Перейти к подтверждению
              </Link>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
