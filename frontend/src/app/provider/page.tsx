import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { AuthShell } from "../auth/auth-shell";
import styles from "../auth/auth.module.css";

export default function ProviderPage() {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className={styles.page} aria-busy="true" />}>
      <ProtectedProviderPage />
    </Suspense>
  );
}

async function ProtectedProviderPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(routes.provider)}`);
  if (user.role !== "PrintProvider") redirect(routes.upload);

  return (
    <AuthShell scene="printer">
      <h1>Панель компании</h1>
      <p className={styles.intro}>Вы вошли как {user.email}.</p>
      <p>Переключение точек и входящие заказы будут добавлены на этапе панели оператора.</p>
    </AuthShell>
  );
}
