import Link from "next/link";
import { routes } from "@/shared/routes";
import { LoginForm } from "../auth/auth-forms";
import { AuthShell } from "../auth/auth-shell";
import styles from "../auth/auth.module.css";

export const instant = false;

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string; email?: string; registered?: string; city?: string }>;
}) {
  const params = await searchParams;
  const startingOrder = params.returnTo === routes.upload;
  const catalog = params.city ? `${routes.points}?${new URLSearchParams({ city: params.city })}` : routes.points;
  return (
    <AuthShell scene="welcome">
      <h1>Вход</h1>
      <p className={styles.intro}>{startingOrder ? "Войдите, чтобы загрузить PDF и сравнить стоимость печати." : "Войдите, чтобы продолжить."}</p>
      {params.registered === "1" ? (
        <p className={styles.success} role="status">Аккаунт создан. Войдите с указанным email и паролем.</p>
      ) : null}
      <LoginForm returnTo={params.returnTo ?? null} initialEmail={params.email} city={params.city} />
      {startingOrder && <p className={styles.catalogLink}><Link href={catalog}>Посмотреть точки без входа</Link></p>}
    </AuthShell>
  );
}
