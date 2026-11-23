import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { PointSelector } from "./point-selector";
import styles from "./points.module.css";

export default function PointsPage() {
  return (
    <Suspense fallback={<main className={styles.page} aria-busy="true" />}>
      <ProtectedPointsPage />
    </Suspense>
  );
}

async function ProtectedPointsPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(routes.points)}`);
  if (user.role !== "CLIENT") redirect(routes.provider);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href={routes.home} aria-label="CopyHouse, главная">
          COPYHOUSE
        </Link>
        <span className={styles.step}>Новый заказ · шаг 2 из 4</span>
      </header>

      <div className={styles.shell}>
        <Link className={styles.backLink} href={routes.upload}>Назад к файлам</Link>
        <div className={styles.heading}>
          <h1>Выберите <span>точку печати</span></h1>
          <p>
            Показываем доступные точки в городе из вашего профиля. Тариф указан за одну страницу.
          </p>
        </div>
        <PointSelector />
      </div>
    </main>
  );
}
