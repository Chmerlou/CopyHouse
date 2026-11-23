import type { ComponentProps, ReactNode } from "react";
import styles from "./ui.module.css";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

type FieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ id, label, error, hint, className = "", ...props }: FieldProps) {
  const fieldId = id ?? props.name;
  const messageId = fieldId ? `${fieldId}-message` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        className={`${styles.input} ${error ? styles.inputError : ""} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        {...props}
      />
      {error || hint ? (
        <small id={messageId} className={error ? styles.error : styles.hint}>
          {error ?? hint}
        </small>
      ) : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${styles.card} ${className}`}>{children}</section>;
}

export function Status({ children, tone = "neutral" }: {
  children: ReactNode;
  tone?: "neutral" | "success" | "error";
}) {
  return (
    <span className={`${styles.status} ${styles[tone]}`} role="status">
      {children}
    </span>
  );
}
