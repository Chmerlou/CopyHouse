import Link from "next/link";
import { connection } from "next/server";
import { dataSource, getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { Button, Field } from "@/shared/ui/ui";
import { PointSelector } from "./point-selector";
import { PixelSprite } from "../pixel-sprite";
import styles from "./points.module.css";

export type PointsSearchParams = Promise<{ documentId?: string | string[]; city?: string | string[] }>;

export async function PointsContent({ searchParams }: { searchParams: PointsSearchParams }) {
  await connection();
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const documentId = user?.role === "CLIENT" && typeof params.documentId === "string"
    ? params.documentId || undefined
    : undefined;
  const needsCity = !user && dataSource === "live";
  const city = needsCity && typeof params.city === "string" ? params.city.trim() : "";
  const showsList = !needsCity || Boolean(city);
  const canSavePoint = !user || user.role === "CLIENT";
  const loginQuery = new URLSearchParams({ returnTo: routes.upload });
  if (city) loginQuery.set("city", city);
  const browseAction = !user
    ? { href: `${routes.login}?${loginQuery}`, label: "Войти и начать заказ" }
    : user.role === "CLIENT"
      ? { href: routes.upload, label: "Загрузить PDF" }
      : user.role === "ADMIN"
        ? { href: routes.adminPoints, label: "К заявкам" }
        : { href: routes.provider, label: "Вернуться в панель точки" };

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        {documentId ? (
          <div className="work-toolbar">
            <Link className={styles.backLink} href={routes.configure(documentId)}>Назад к настройкам печати</Link>
            <p className="work-step">Шаг 3 из 4</p>
          </div>
        ) : null}
        <div className={styles.intro}>
          <div className={styles.heading}>
            <h1>{documentId ? "Выберите точку печати" : "Точки печати"}</h1>
            <p>{documentId
              ? "Сравните итоговую цену, адрес и часы работы."
              : canSavePoint
                ? "Посмотрите адреса, часы работы и цены за страницу. Копицентр можно выбрать до загрузки PDF."
                : "Сравните адреса, часы работы и тарифы за страницу."}
            </p>
          </div>
          <PixelSprite kind="kiosk" className={styles.scene} />
        </div>
        {needsCity ? (
          <form action={routes.points} className={styles.cityForm} key={city}>
            <Field name="city" label="Город" defaultValue={city} required maxLength={100} />
            <Button type="submit">Показать точки</Button>
          </form>
        ) : null}
        {showsList ? <PointSelector
          key={documentId ?? city}
          city={city || undefined}
          documentId={documentId}
          selectable={canSavePoint}
          continueHref={documentId ? routes.checkout(documentId) : canSavePoint ? browseAction.href : undefined}
          continueLabel={documentId ? "Перейти к подтверждению" : browseAction.label}
        /> : null}
        {!documentId && (!showsList || !canSavePoint) ? (
          <div className={styles.catalogAction}>
            <p>Для просмотра каталога вход не нужен.</p>
            <Link href={browseAction.href}>{browseAction.label}</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
