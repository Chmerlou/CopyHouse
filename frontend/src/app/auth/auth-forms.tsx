"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import {
  type FieldErrors,
  type RegisterRole,
  routeForUser,
  validateLogin,
  validateRegistration,
} from "@/shared/auth/contracts";
import { routes, safeReturnTo } from "@/shared/routes";
import { Button, Field } from "@/shared/ui/ui";
import styles from "./auth.module.css";

type ErrorBody = Pick<ApiSchema<"Error">, "code" | "message">;

export function LoginForm({ returnTo, initialEmail = "" }: {
  returnTo: string | null;
  initialEmail?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const input = { email, password };
    const nextErrors = validateLogin(input);
    setErrors(nextErrors);
    setMessage(null);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await response.json() as { user: ApiSchema<"User"> } | ErrorBody;
      if (!response.ok || !("user" in body)) {
        if (response.status === 401) setPassword("");
        setMessage("Неверный email или пароль");
        return;
      }

      const destination = body.user.role === "CLIENT"
        ? safeReturnTo(returnTo)
        : routeForUser(body.user);
      router.push(destination);
      router.refresh();
    } catch {
      setMessage("Не удалось войти. Проверьте соединение и повторите попытку");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        error={errors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Field
        label="Пароль"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        error={errors.password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {message ? <p className={styles.formError} role="alert">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Входим…" : "Войти"}
      </Button>
      <p className={styles.switchCopy}>
        Нет аккаунта? <Link href={`${routes.register}?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`}>Зарегистрироваться</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ returnTo }: { returnTo: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<RegisterRole>("CLIENT");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const input = { email, password, city, role };
    const nextErrors = validateRegistration(input);
    setErrors(nextErrors);
    setMessage(null);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = await response.json() as ErrorBody;
        setMessage(body.code === "EMAIL_ALREADY_USED"
          ? "Этот email уже используется"
          : "Не удалось завершить регистрацию");
        return;
      }

      const query = new URLSearchParams({
        registered: "1",
        email: email.trim(),
        returnTo: safeReturnTo(returnTo),
      });
      router.push(`${routes.login}?${query}`);
    } catch {
      setMessage("Не удалось завершить регистрацию. Повторите попытку");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <fieldset className={styles.roleGroup}>
        <legend>Тип аккаунта</legend>
        <label>
          <input
            type="radio"
            name="role"
            value="CLIENT"
            checked={role === "CLIENT"}
            onChange={() => setRole("CLIENT")}
          />
          Клиент
        </label>
        <label>
          <input
            type="radio"
            name="role"
            value="PrintProvider"
            checked={role === "PrintProvider"}
            onChange={() => setRole("PrintProvider")}
          />
          Компания печати
        </label>
      </fieldset>
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        error={errors.email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Field
        label="Пароль"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        error={errors.password}
        hint="От 8 до 72 символов, минимум одна латинская буква и одна цифра"
        onChange={(event) => setPassword(event.target.value)}
      />
      <Field
        label="Город"
        name="city"
        autoComplete="address-level2"
        value={city}
        error={errors.city}
        onChange={(event) => setCity(event.target.value)}
      />
      {message ? <p className={styles.formError} role="alert">{message}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Создаём аккаунт…" : "Создать аккаунт"}
      </Button>
      <p className={styles.switchCopy}>
        Уже есть аккаунт? <Link href={`${routes.login}?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`}>Войти</Link>
      </p>
    </form>
  );
}
