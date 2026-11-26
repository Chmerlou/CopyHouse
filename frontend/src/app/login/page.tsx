import { LoginForm } from "../auth/auth-forms";
import { AuthShell } from "../auth/auth-shell";
import styles from "../auth/auth.module.css";

export const instant = false;

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string; email?: string; registered?: string; city?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell scene="welcome">
      <h1>Вход</h1>
      <p className={styles.intro}>Войдите, чтобы продолжить.</p>
      {params.registered === "1" ? (
        <p className={styles.success} role="status">Аккаунт создан. Войдите с указанным email и паролем.</p>
      ) : null}
      <LoginForm returnTo={params.returnTo ?? null} initialEmail={params.email} city={params.city} />
    </AuthShell>
  );
}
