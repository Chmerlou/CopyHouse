import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { routeForUser } from "@/shared/auth/contracts";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { ConfigureForm } from "./configure-form";
import styles from "./configure.module.css";

export default function ConfigurePage({ params }: { params: Promise<{ documentId: string }> }) {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className={styles.page} aria-busy="true" />}>
      <ProtectedConfigurePage params={params} />
    </Suspense>
  );
}

async function ProtectedConfigurePage({ params }: { params: Promise<{ documentId: string }> }) {
  await connection();
  const [user, { documentId }] = await Promise.all([getCurrentUser(), params]);
  const returnTo = routes.configure(documentId);
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(returnTo)}`);
  if (user.role !== "CLIENT") redirect(routeForUser(user));

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <div className="work-toolbar">
          <Link className={styles.backLink} href={routes.upload}>
            Назад к загрузке
          </Link>
          <p className="work-step">Шаг 2 из 4</p>
        </div>
        <ConfigureForm documentId={documentId} />
      </div>
    </main>
  );
}
