import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import styles from "./site-header.module.css";

function LoginLink() {
  return <Link className={styles.login} href={routes.login}>Войти</Link>;
}

async function SignedInLinks() {
  await connection();
  const user = await getCurrentUser();
  if (!user) return <LoginLink />;

  return (
    <>
      {user.role === "CLIENT" ? (
        <Link className={styles.destination} href={routes.accountOrders}>Мои заказы</Link>
      ) : user.role === "PrintProvider" ? (
        <Link className={styles.destination} href={routes.provider}>Панель точки</Link>
      ) : (
        <Link className={styles.destination} href={routes.adminPoints}>Заявки</Link>
      )}
      <Link className={styles.account} href={routes.settings}>Аккаунт</Link>
    </>
  );
}

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
          <Suspense fallback={<LoginLink />}><SignedInLinks /></Suspense>
        </nav>
      </div>
    </header>
  );
}
