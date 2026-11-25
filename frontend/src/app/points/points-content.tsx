import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { PointSelector } from "./point-selector";
import { PixelSprite } from "../pixel-sprite";
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
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        {canSelect ? (
          <div className="work-toolbar">
            <Link className={styles.backLink} href={routes.upload}>Назад к загрузке</Link>
            <p className="work-step">Шаг 2 из 4</p>
          </div>
        ) : null}
        <div className={styles.intro}>
          <div className={styles.heading}>
            <h1>{canSelect ? "Выберите точку печати" : "Точки печати"}</h1>
            <p>{canSelect
              ? "Показываем доступные точки в городе из вашего профиля. Тариф указан за одну страницу."
              : "Сравните адреса, часы работы и публичные тарифы. Для оформления заказа загрузите PDF."}
            </p>
          </div>
          <PixelSprite kind="kiosk" className={styles.scene} />
        </div>
        <PointSelector
          selectable={canSelect}
          continueHref={canSelect && typeof params.documentId === "string"
            ? routes.configure(params.documentId)
            : undefined}
        />
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
