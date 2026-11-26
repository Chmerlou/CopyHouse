import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { routeForUser } from "@/shared/auth/contracts";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { UploadPageClient } from "./upload-page-client";
import { PixelSprite } from "../pixel-sprite";
import styles from "./upload.module.css";

export default function UploadPage() {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className={styles.page} aria-busy="true" />}>
      <ProtectedUploadPage />
    </Suspense>
  );
}

async function ProtectedUploadPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(routes.upload)}`);
  if (user.role !== "CLIENT") redirect(routeForUser(user));

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <p className="work-step">Шаг 1 из 4</p>
        <div className={styles.content}>
          <UploadPageClient />
          <aside className={styles.note}>
            <div>
              <strong>Кто увидит файл</strong>
              <p>Файл доступен вам. Выбранный копицентр получит доступ после оплаты заказа.</p>
            </div>
            <PixelSprite kind="paper" className={styles.noteArt} />
          </aside>
        </div>
      </div>
    </main>
  );
}
