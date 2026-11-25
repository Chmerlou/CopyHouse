import Link from "next/link";
import { routes } from "@/shared/routes";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a className={styles.skip} href="#main-content">Перейти к содержимому</a>
      <div className={styles.inner}>
        <Link className={styles.logo} href={routes.home} aria-label="CopyHouse, главная">
          COPYHOUSE
        </Link>
        <nav className={styles.nav} aria-label="Основная навигация">
          <Link className={styles.guide} href="/#how-it-works">Как работает</Link>
          <Link href={routes.points}>Точки печати</Link>
          <Link className={styles.login} href={routes.login}>Войти</Link>
        </nav>
      </div>
    </header>
  );
}
