"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import {
  readPendingDocuments,
  readPrintOptions,
  savePendingDocuments,
  savePrintOptions,
} from "@/shared/order-draft";
import { routes } from "@/shared/routes";
import { Button } from "@/shared/ui/ui";
import { PixelSprite } from "../../pixel-sprite";
import styles from "./configure.module.css";

type Document = ApiSchema<"Document">;
type ColorMode = ApiSchema<"ColorMode">;

export type LoadDocument = (documentId: string) => Promise<Document>;

const subscribeToHydration = () => () => {};

async function requestDocument(documentId: string): Promise<Document> {
  const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("document_failed");
  return response.json() as Promise<Document>;
}

export function ConfigureForm({
  documentId,
  loadDocument = requestDocument,
}: {
  documentId: string;
  loadDocument?: LoadDocument;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [document, setDocument] = useState<Document | null>(null);
  const [documentError, setDocumentError] = useState(false);
  const [selectedColorMode, setSelectedColorMode] = useState<ColorMode | null>(null);
  const [selectedCopies, setSelectedCopies] = useState<string | null>(null);
  const storedDocument = hydrated
    ? readPendingDocuments().find((item) => item.id === documentId) ?? null
    : null;
  const storedSettings = hydrated ? readPrintOptions(documentId) : null;
  const visibleDocument = document ?? storedDocument;
  const colorMode = selectedColorMode ?? storedSettings?.colorMode ?? "BW";
  const copiesInput = selectedCopies ?? String(storedSettings?.copies ?? 1);

  const copies = Number(copiesInput);
  const copiesValid = Number.isSafeInteger(copies) && copies >= 1 && copies <= 100;

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

  function comparePrices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!visibleDocument || !copiesValid) return;
    savePrintOptions({ documentId, colorMode, copies });
    router.push(routes.orderPoints(documentId));
  }

  return (
    <section className={styles.workspace} aria-labelledby="configure-title">
      <div className={styles.heading}>
        <h1 id="configure-title">Настройте печать</h1>
        <p>Выберите цвет печати и количество копий. Затем вы увидите стоимость заказа в доступных копицентрах.</p>
      </div>

      <div className={styles.layout}>
        <form className={styles.formPanel} onSubmit={comparePrices}>
          <div className={styles.documentRow}>
            <span className={styles.fileMark} aria-hidden="true">PDF</span>
            <div>
              <strong>{visibleDocument?.originalName ?? (documentError ? "Файл недоступен" : "Получаем данные файла…")}</strong>
              {visibleDocument ? <span>{visibleDocument.pageCount} стр.</span> : null}
            </div>
          </div>

          {documentError ? (
            <p className={styles.inlineError} role="alert">
              Обновите страницу. Если файл по-прежнему недоступен, загрузите его заново.
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
              {copiesValid ? "От 1 до 100 копий." : "Введите целое число от 1 до 100."}
            </small>
          </div>
          <Button className={styles.compare} type="submit" disabled={!visibleDocument || !copiesValid}>
            Сравнить цены
          </Button>
        </form>
        <PixelSprite kind="printer" className={styles.scene} />
      </div>
    </section>
  );
}
