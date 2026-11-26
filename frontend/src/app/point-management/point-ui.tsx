import Link from "next/link";
import type { ReactNode } from "react";
import type { ApiSchema } from "@/shared/api/contract";
import { Button } from "@/shared/ui/ui";
import { PixelSprite } from "../pixel-sprite";
import { displayPrice } from "./price";
import styles from "./point-management.module.css";

export function PointWorkspace({ title, intro, children }: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.pageHeading}>
          <div>
            <h1>{title}</h1>
            {intro ? <p>{intro}</p> : null}
          </div>
          <PixelSprite kind="printer" className={styles.scene} />
        </div>
        {children}
      </div>
    </main>
  );
}

export function PointLoadError({ href, page }: { href: string; page: number }) {
  return (
    <div className={styles.panel}>
      <p role="alert">Не удалось загрузить список. Попробуйте ещё раз.</p>
      <form action={href} className={styles.actions}>
        <input type="hidden" name="page" value={page} />
        <Button type="submit">Повторить</Button>
      </form>
    </div>
  );
}

export const pointPageSize = 12;
const maxPointPage = 1000;

export function readPointPage(value: string | string[] | undefined) {
  return typeof value === "string" && /^\d{1,4}$/.test(value)
    ? Math.min(maxPointPage, Math.max(1, Number(value))) : 1;
}

export function PointPagination({ href, page, totalPages, label, param = "page" }: {
  href: string;
  page: number;
  totalPages: number;
  label: string;
  param?: string;
}) {
  if (totalPages <= 1 && page <= 1) return null;
  function pageHref(target: number) {
    const [path, query] = href.split("?");
    const params = new URLSearchParams(query);
    if (target === 1) params.delete(param);
    else params.set(param, String(target));
    return params.size ? `${path}?${params}` : path;
  }
  return (
    <nav className={styles.pagination} aria-label={label}>
      {page > 1 ? <Link href={pageHref(page - 1)}>Назад</Link> : null}
      <span>Страница {page} из {totalPages}</span>
      {page < totalPages && page < maxPointPage ? <Link href={pageHref(page + 1)}>Дальше</Link> : null}
    </nav>
  );
}

export function PointRates({ point }: { point: ApiSchema<"PrintPointPublic"> }) {
  return (
    <dl className={styles.rates} aria-label="Цена за страницу">
      <div><dt>Чёрно-белая</dt><dd>{displayPrice(point.pricePerPageBw)}</dd></div>
      <div><dt>Цветная</dt><dd>{displayPrice(point.pricePerPageColor)}</dd></div>
    </dl>
  );
}

export function PointStatus({ point }: { point: ApiSchema<"PrintPointOwner"> }) {
  const label = point.status === "PENDING" ? "На проверке"
    : point.status === "REJECTED" ? "Отклонена"
      : point.isActive ? "В каталоге" : "Скрыта из каталога";
  const tone = point.status === "APPROVED" && !point.isActive ? "hidden" : point.status;
  return <span className={styles.status} data-tone={tone}>{label}</span>;
}
