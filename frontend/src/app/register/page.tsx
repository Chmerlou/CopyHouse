import Link from "next/link";
import { Card } from "@/shared/ui/ui";
import { RegisterForm } from "../auth/auth-forms";
import styles from "../auth/auth.module.css";

export const instant = false;

export default async function RegisterPage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.brand} href="/">COPYHOUSE</Link>
        <Card className={styles.card}>
          <h1>Регистрация</h1>
          <p className={styles.intro}>Создайте клиентский или корпоративный аккаунт.</p>
          <RegisterForm returnTo={params.returnTo ?? null} />
        </Card>
      </div>
    </main>
  );
}
