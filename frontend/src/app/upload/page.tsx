import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { UploadPageClient } from "./upload-page-client";
import styles from "./upload.module.css";

export default function UploadPage() {
  return (
    <Suspense fallback={<main className={styles.page} aria-busy="true" />}>
      <ProtectedUploadPage />
    </Suspense>
  );
}

async function ProtectedUploadPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(routes.upload)}`);
  if (user.role !== "CLIENT") redirect(routes.provider);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="CopyHouse, главная">
          COPYHOUSE
        </Link>
        <span className={styles.orderLabel}>Новый заказ · шаг 1 из 4</span>
      </header>

      <div className={styles.shell}>
        <div className={styles.content}>
          <UploadPageClient />
          <aside className={styles.note}>
            <strong>Ваши файлы защищены</strong>
            <p>Они будут доступны только вам и выбранной точке печати.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
