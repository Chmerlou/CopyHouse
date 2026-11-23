import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { Card } from "@/shared/ui/ui";
import styles from "../auth/auth.module.css";

export default function ProviderPage() {
  return (
    <Suspense fallback={<main className={styles.page} aria-busy="true" />}>
      <ProtectedProviderPage />
    </Suspense>
  );
}

async function ProtectedProviderPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(routes.provider)}`);
  if (user.role !== "PrintProvider") redirect(routes.upload);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.brand} href={routes.home}>COPYHOUSE</Link>
        <Card className={styles.card}>
          <h1>Панель компании</h1>
          <p className={styles.intro}>Вы вошли как {user.email}.</p>
          <p>Переключение точек и входящие заказы будут добавлены на этапе панели оператора.</p>
        </Card>
      </div>
    </main>
  );
}
