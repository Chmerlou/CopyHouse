import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { PointSelector } from "./point-selector";
import styles from "./points.module.css";

export type PointsSearchParams = Promise<{ documentId?: string | string[] }>;

export async function PointsContent({ searchParams }: { searchParams: PointsSearchParams }) {
  await connection();
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const hasDocument = typeof params.documentId === "string" && params.documentId.length > 0;
  const canSelect = user?.role === "CLIENT" && hasDocument;
  const browseAction = !user
    ? { href: `${routes.login}?returnTo=${encodeURIComponent(routes.upload)}`, label: "Войти и начать заказ" }
    : user.role === "CLIENT"
      ? { href: routes.upload, label: "Загрузить документ" }
      : { href: routes.provider, label: "Вернуться в панель" };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href={routes.home} aria-label="CopyHouse, главная">
          COPYHOUSE
        </Link>
        <span className={styles.step}>
          {canSelect ? "Новый заказ · шаг 2 из 4" : "Каталог · публичные цены"}
        </span>
      </header>

      <div className={styles.shell}>
        <Link className={styles.backLink} href={canSelect ? routes.upload : routes.home}>
          {canSelect ? "Назад к файлам" : "На главную"}
        </Link>
        <div className={styles.heading}>
          <h1>{canSelect ? <>Выберите <span>точку печати</span></> : <>Точки <span>печати</span></>}</h1>
          <p>{canSelect
            ? "Показываем доступные точки в городе из вашего профиля. Тариф указан за одну страницу."
            : "Сравните адреса, часы работы и публичные тарифы. Для оформления заказа загрузите PDF."}
          </p>
        </div>
        <PointSelector selectable={canSelect} />
        {!canSelect ? (
          <div className={styles.catalogAction}>
            <p>Файл понадобится только после входа — каталог и цены доступны без регистрации.</p>
            <Link href={browseAction.href}>{browseAction.label}</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
