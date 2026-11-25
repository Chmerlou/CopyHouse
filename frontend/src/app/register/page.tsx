import { RegisterForm } from "../auth/auth-forms";
import { AuthShell } from "../auth/auth-shell";
import styles from "../auth/auth.module.css";

export const instant = false;

export default async function RegisterPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell scene="welcome">
      <h1>Регистрация</h1>
      <p className={styles.intro}>Создайте клиентский или корпоративный аккаунт.</p>
      <RegisterForm returnTo={params.returnTo ?? null} />
    </AuthShell>
  );
}
