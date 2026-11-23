import Link from "next/link";
import { Card } from "@/shared/ui/ui";
import { LoginForm } from "../auth/auth-forms";
import styles from "../auth/auth.module.css";

export const instant = false;

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string; email?: string; registered?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.brand} href="/">COPYHOUSE</Link>
        <Card className={styles.card}>
          <h1>Вход</h1>
          <p className={styles.intro}>Войдите до выбора и проверки файла.</p>
          {params.registered === "1" ? (
            <p className={styles.success} role="status">Аккаунт создан. Теперь войдите.</p>
          ) : null}
          <LoginForm returnTo={params.returnTo ?? null} initialEmail={params.email} />
        </Card>
      </div>
    </main>
  );
}
