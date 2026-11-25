"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { SELECTED_PRINT_POINT_KEY } from "@/shared/order-draft";
import styles from "./points.module.css";

type PrintPoint = ApiSchema<"PrintPointPublic">;
type PrintPointList = ApiSchema<"PrintPointPublicList">;

export type ListPrintPoints = () => Promise<PrintPoint[]>;

async function requestPrintPointPage(page: number): Promise<PrintPointList> {
  let response: Response;
  try {
    response = await fetch(`/api/print-points?page=${page}&limit=100`, { cache: "no-store" });
  } catch {
    throw new Error("Нет соединения. Проверьте интернет и повторите попытку.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(error?.message ?? "Не удалось выполнить операцию");
  }

  return response.json() as Promise<PrintPointList>;
}

export async function listPrintPoints(): Promise<PrintPoint[]> {
  const firstPage = await requestPrintPointPage(1);
  if (firstPage.pagination.totalPages <= 1) return firstPage.items;

  const remainingPages = await Promise.all(
    Array.from(
      { length: firstPage.pagination.totalPages - 1 },
      (_, index) => requestPrintPointPage(index + 2),
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
}: {
  listPrintPoints?: ListPrintPoints;
  selectable?: boolean;
  continueHref?: string;
}) {
  const [points, setPoints] = useState<PrintPoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("Не удалось выполнить операцию");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;

    requestPoints().then((result) => {
      if (!active) return;
      const storedId = selectable ? sessionStorage.getItem(SELECTED_PRINT_POINT_KEY) : null;
      setPoints(result);
      setSelectedId(result.some((point) => point.id === storedId) ? storedId : null);
      if (selectable && storedId && !result.some((point) => point.id === storedId)) {
        sessionStorage.removeItem(SELECTED_PRINT_POINT_KEY);
      }
      setStatus("ready");
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : "Не удалось выполнить операцию");
      setStatus("error");
    });

    return () => {
      active = false;
    };
  }, [requestPoints, requestVersion, selectable]);

  function reload() {
    setStatus("loading");
    setRequestVersion((version) => version + 1);
  }

  function selectPoint(id: string) {
    setSelectedId(id);
    sessionStorage.setItem(SELECTED_PRINT_POINT_KEY, id);
  }

  if (status === "loading") {
    return (
      <div
        className={styles.skeletonList}
        role="status"
        aria-label="Загружаем точки печати"
        aria-busy="true"
      >
        {[0, 1, 2].map((item) => <span key={item} />)}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.state} role="alert">
        <strong>Не удалось загрузить точки</strong>
        <p>{error}</p>
        <button type="button" onClick={reload}>Повторить</button>
      </div>
    );
  }

  if (!points.length) {
    return (
      <div className={styles.state} role="status">
        <strong>В вашем городе пока нет точек печати</strong>
        <p>Когда точки появятся, они будут показаны здесь.</p>
        <button type="button" onClick={reload}>Обновить</button>
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
            <span className={styles.prices}>
              <span><small>Ч/б страница</small>{money.format(point.pricePerPageBw / 100)}</span>
              <span><small>Цветная страница</small>{money.format(point.pricePerPageColor / 100)}</span>
            </span>
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
      <fieldset className={styles.fieldset}>
        <legend className={styles.srOnly}>Выберите одну точку печати</legend>
        {pointList}
      </fieldset>
      <p className={styles.selectionStatus} aria-live="polite">
        {selectedId
          ? "Точка сохранена. Вы сможете изменить выбор до оформления заказа."
          : "Выберите точку, чтобы продолжить оформление заказа."}
      </p>
      {selectedId && continueHref ? (
        <div className={styles.continueAction}>
          <Link href={continueHref}>Настроить печать</Link>
        </div>
      ) : null}
    </>
  );
}
