"use client";

import { type FormEvent, useActionState, useEffect, useId, useRef, useState } from "react";
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
  const submittedFrom = useRef<{ form: HTMLFormElement; focused: Element | null } | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const primaryButton = useRef<HTMLButtonElement>(null);
  const statusText = useRef<HTMLParagraphElement>(null);
  const errorText = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const previous = submittedFrom.current;
    if (pending || !feedback || !previous) return;
    submittedFrom.current = null;
    if (document.activeElement !== document.body && document.activeElement !== previous.focused) return;

    if (feedback.fieldError) {
      previous.form.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus();
    } else if (feedback.error) {
      errorText.current?.focus();
    } else {
      (codeInput.current ?? primaryButton.current ?? statusText.current)?.focus();
    }
  }, [feedback, pending]);

  function rememberFocus(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const focused = document.activeElement;
    submittedFrom.current = form.contains(focused) ? { form, focused } : null;
  }

  return (
    <div className={styles.orderControls}>
      <div className={`${shared.feedback} ${styles.feedback}`}>
        <p ref={errorText} tabIndex={-1} className={shared.error} role="alert">{feedback?.error}</p>
        <p ref={statusText} tabIndex={-1} className={shared.success} role="status">{feedback?.message}</p>
      </div>
      {primary && (
        <form action={action} onSubmit={rememberFocus} className={styles.operationForm}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="operation" value={primary.operation} />
          {showCode && (
            <Field ref={codeInput} id={`${id}-code`} name="code" label="Код выдачи" value={code}
              onChange={(event) => setCode(event.target.value)} disabled={pending}
              inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} required
              hint="6 цифр из личного кабинета клиента" error={feedback?.fieldError} />
          )}
          <Button ref={primaryButton} type="submit" disabled={pending} aria-busy={pending}>{primary.label}</Button>
        </form>
      )}
      {canCancel && (
        <details className={styles.cancelOrder}>
          <summary>Отменить заказ</summary>
          <form action={action} onSubmit={rememberFocus} className={styles.operationForm}>
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
