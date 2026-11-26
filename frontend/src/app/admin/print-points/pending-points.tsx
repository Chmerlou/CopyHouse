"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { routes } from "@/shared/routes";
import { Button } from "@/shared/ui/ui";
import { PointRates, PointStatus } from "../../point-management/point-ui";
import styles from "../../point-management/point-management.module.css";
import { approvePoint } from "./actions";

export function PendingPoints({ points, page, total }: {
  points: ApiSchema<"PrintPointAdmin">[];
  page: number;
  total: number;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [state, action, pending] = useActionState(approvePoint, null);
  const confirmationId = useId();
  const feedback = useRef<HTMLParagraphElement>(null);
  const showFeedback = Boolean(state && !pending);

  useEffect(() => {
    if (showFeedback) feedback.current?.focus();
  }, [showFeedback, state]);

  return (
    <section aria-labelledby="pending-points-heading">
      <div className={styles.sectionHeading}>
        <h2 id="pending-points-heading">На рассмотрении</h2>
        <p>Заявок: {total}</p>
      </div>
      <div className={styles.feedback}>
        <p ref={!state?.error ? feedback : undefined} tabIndex={-1} role="status" className={showFeedback && !state?.error ? styles.success : undefined}>
          {showFeedback && !state?.error ? state?.message : null}
        </p>
        <p ref={state?.error ? feedback : undefined} tabIndex={-1} role="alert" className={showFeedback && state?.error ? styles.error : undefined}>
          {showFeedback && state?.error ? state.message : null}
        </p>
      </div>
      {points.length ? (
        <ul className={styles.list}>
          {points.map((point) => (
            <li key={point.id} className={styles.panel}>
              <div className={styles.pointRow}>
                <div className={styles.pointIdentity}>
                  <h3>{point.name}</h3>
                  <p>{point.city}, {point.address}</p>
                  <p>Часы работы: {point.workingHours}</p>
                  <p>Владелец: {point.owner.email}</p>
                </div>
                <div className={styles.pointSide}>
                  <PointStatus point={point} />
                  <PointRates point={point} />
                </div>
                {confirming !== point.id ? (
                  <div className={styles.rowAction}>
                    <Button id={`approve-${point.id}`} type="button" disabled={pending}
                      aria-label={`Одобрить заявку «${point.name}»`}
                      onClick={() => {
                        setConfirming(point.id);
                        requestAnimationFrame(() => document.getElementById(confirmationId)?.focus());
                      }}>Одобрить заявку</Button>
                  </div>
                ) : null}
              </div>
              {confirming === point.id ? (
                <form action={action} className={styles.editor} aria-describedby={confirmationId}>
                  <input type="hidden" name="pointId" value={point.id} />
                  <p id={confirmationId} tabIndex={-1}>После одобрения точка появится в каталоге и сможет принимать заказы.</p>
                  <div className={styles.actions}>
                    <Button type="submit" disabled={pending} aria-busy={pending}>
                      {pending ? "Одобряем…" : "Подтвердить одобрение"}
                    </Button>
                    <Button type="button" variant="secondary" disabled={pending} onClick={() => {
                      setConfirming(null);
                      requestAnimationFrame(() => document.getElementById(`approve-${point.id}`)?.focus());
                    }}>Отмена</Button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.panel}>
          <h3>{total > 0 ? "На этой странице больше нет заявок" : "Новых заявок пока нет"}</h3>
          {total > 0 && page > 1 ? <Link className={styles.textLink} href={routes.adminPoints}>К списку заявок</Link> : null}
        </div>
      )}
    </section>
  );
}
