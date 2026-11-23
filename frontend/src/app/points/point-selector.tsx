"use client";

import { useEffect, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import styles from "./points.module.css";

export const SELECTED_PRINT_POINT_KEY = "copyhouse.selectedPrintPointId";

type PrintPoint = ApiSchema<"PrintPointPublic">;
type PrintPointList = ApiSchema<"PrintPointPublicList">;

export type ListPrintPoints = () => Promise<PrintPointList>;

export async function listPrintPoints(): Promise<PrintPointList> {
  let response: Response;
  try {
    response = await fetch("/api/print-points", { cache: "no-store" });
  } catch {
    throw new Error("Нет соединения. Проверьте интернет и повторите попытку.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(error?.message ?? "Не удалось выполнить операцию");
  }

  return response.json() as Promise<PrintPointList>;
}

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
});

export function PointSelector({
  listPrintPoints: requestPoints = listPrintPoints,
}: {
  listPrintPoints?: ListPrintPoints;
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
      const storedId = sessionStorage.getItem(SELECTED_PRINT_POINT_KEY);
      setPoints(result.items);
      setSelectedId(result.items.some((point) => point.id === storedId) ? storedId : null);
      if (storedId && !result.items.some((point) => point.id === storedId)) {
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
  }, [requestPoints, requestVersion]);

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

  return (
    <>
      <fieldset className={styles.fieldset}>
        <legend className={styles.srOnly}>Выберите одну точку печати</legend>
        <div className={styles.pointList}>
          {points.map((point) => {
            const isSelected = point.id === selectedId;
            return (
              <label
                className={`${styles.point} ${isSelected ? styles.selected : ""}`}
                key={point.id}
              >
                <input
                  type="radio"
                  name="print-point"
                  value={point.id}
                  checked={isSelected}
                  onChange={() => selectPoint(point.id)}
                />
                <span className={styles.pointMain}>
                  <strong>{point.name}</strong>
                  <span>{point.address}</span>
                  <span className={styles.hours}>{point.workingHours}</span>
                </span>
                <span className={styles.prices}>
                  <span><small>Ч/б страница</small>{money.format(point.pricePerPageBw / 100)}</span>
                  <span><small>Цветная страница</small>{money.format(point.pricePerPageColor / 100)}</span>
                </span>
                <span className={styles.choice}>{isSelected ? "Выбрано" : "Выбрать"}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p className={styles.selectionStatus} aria-live="polite">
        {selectedId
          ? "Точка сохранена. Вы сможете изменить выбор до оформления заказа."
          : "Выберите точку, чтобы продолжить оформление заказа."}
      </p>
    </>
  );
}
