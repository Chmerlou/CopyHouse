"use client";

import { useActionState, useId, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { Button, Field } from "@/shared/ui/ui";
import { changePointOrder } from "./actions";
import shared from "../point-management/point-management.module.css";
import styles from "./provider-orders.module.css";

export function OrderActions({ orderId, status }: { orderId: string; status: ApiSchema<"OrderStatus"> }) {
  const [feedback, action, pending] = useActionState(changePointOrder, null);
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const id = useId();
  const canCancel = status === "PAID" || status === "PRINTING";
  const showCode = status === "READY";
  const primary = status === "PAID" ? { operation: "start", label: "Принять в печать" }
    : status === "PRINTING" ? { operation: "ready", label: "Готов к выдаче" }
      : showCode ? { operation: "issue", label: "Выдать заказ" } : null;

  return (
    <div className={styles.orderControls}>
      <div className={`${shared.feedback} ${styles.feedback}`}>
        <p className={shared.error} role="alert">{feedback?.error}</p>
        <p className={shared.success} role="status">{feedback?.message}</p>
      </div>
      {primary && (
        <form action={action} className={styles.operationForm}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="operation" value={primary.operation} />
          {showCode && (
            <Field id={`${id}-code`} name="code" label="Код выдачи" value={code}
              onChange={(event) => setCode(event.target.value)} disabled={pending}
              inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} required
              hint="6 цифр из личного кабинета клиента" error={feedback?.fieldError} />
          )}
          <Button type="submit" disabled={pending} aria-busy={pending}>{primary.label}</Button>
        </form>
      )}
      {canCancel && (
        <details className={styles.cancelOrder}>
          <summary>Отменить заказ</summary>
          <form action={action} className={styles.operationForm}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="operation" value="cancel" />
            <Field id={`${id}-reason`} name="reason" label="Причина отмены" value={reason}
              onChange={(event) => setReason(event.target.value)} disabled={pending}
              maxLength={500} required error={feedback?.fieldError} />
            <Button variant="secondary" type="submit" disabled={pending} aria-busy={pending}>Подтвердить отмену</Button>
          </form>
        </details>
      )}
    </div>
  );
}
