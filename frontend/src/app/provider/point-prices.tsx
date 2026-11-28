"use client";

import { useActionState, useId, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { Button, Field } from "@/shared/ui/ui";
import { priceInput, readPrice } from "../point-management/price";
import { PointRates, PointStatus } from "../point-management/point-ui";
import styles from "../point-management/point-management.module.css";
import { savePointPrices } from "./actions";

type Point = ApiSchema<"PrintPointOwner">;

function PriceEditor({ point, id, close }: { point: Point; id: string; close: () => void }) {
  const [state, action, pending] = useActionState(savePointPrices, null);
  const [bw, setBw] = useState(priceInput(point.pricePerPageBw));
  const [color, setColor] = useState(priceInput(point.pricePerPageColor));
  const bwPrice = readPrice(bw);
  const colorPrice = readPrice(color);
  const changed = bwPrice !== point.pricePerPageBw || colorPrice !== point.pricePerPageColor;
  const bwError = bwPrice === null ? state?.fields?.pricePerPageBw : undefined;
  const colorError = colorPrice === null ? state?.fields?.pricePerPageColor : undefined;
  const error = state?.error ?? (bwError || colorError ? "Проверьте цены в отмеченных полях." : null);

  return (
    <form id={id} action={action} className={styles.editor} aria-describedby={`${id}-intro`}>
      <p id={`${id}-intro`}>Цена в рублях за одну страницу А4.</p>
      {point.status === "REJECTED" ? <p>После сохранения точка снова отправится на проверку.</p> : null}
      <input type="hidden" name="pointId" value={point.id} />
      <div className={styles.fields}>
        <Field id={`${id}-bw`} name="pricePerPageBw" label="Чёрно-белая печать" inputMode="decimal"
          value={bw} required maxLength={11} disabled={pending} className={styles.priceInput}
          error={bwError}
          onChange={(event) => setBw(event.target.value)} />
        <Field id={`${id}-color`} name="pricePerPageColor" label="Цветная печать" inputMode="decimal"
          value={color} required maxLength={11} disabled={pending} className={styles.priceInput}
          error={colorError}
          onChange={(event) => setColor(event.target.value)} />
      </div>
      <p role="alert" className={error ? styles.inlineError : undefined}>{error}</p>
      <p role="status" className={state?.message && !changed ? styles.success : undefined}>{changed ? null : state?.message}</p>
      <div className={styles.actions}>
        <Button type="submit" disabled={pending || !changed} aria-busy={pending}>
          {pending ? "Сохраняем…" : "Сохранить тарифы"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={close}>
          {changed ? "Отмена" : "Закрыть"}
        </Button>
      </div>
    </form>
  );
}

export function PointPrices({ point }: { point: Point }) {
  const [editing, setEditing] = useState(false);
  const id = useId();

  return (
    <li className={styles.panel}>
      <div className={styles.pointRow}>
        <div className={styles.pointIdentity}>
          <h3>{point.name}</h3>
          <p>{point.city}, {point.address}</p>
          {point.rejectionReason ? <p>Причина отказа: {point.rejectionReason}</p> : null}
        </div>
        <div className={styles.pointSide}>
          <PointStatus point={point} />
          <PointRates point={point} />
        </div>
        {!editing ? (
          <div className={styles.rowAction}>
            <Button id={`${id}-edit`} type="button" variant="secondary" aria-label={`Изменить тарифы «${point.name}»`} onClick={() => {
              setEditing(true);
              requestAnimationFrame(() => document.getElementById(`${id}-bw`)?.focus());
            }}>Изменить тарифы</Button>
          </div>
        ) : null}
      </div>
      {editing ? (
        <PriceEditor point={point} id={id} close={() => {
          setEditing(false);
          requestAnimationFrame(() => document.getElementById(`${id}-edit`)?.focus());
        }} />
      ) : null}
    </li>
  );
}
