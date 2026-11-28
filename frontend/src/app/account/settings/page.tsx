import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { dataSource, getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { AuthShell } from "../../auth/auth-shell";
import styles from "../../auth/auth.module.css";
import { SessionActions } from "./session-actions";

async function SettingsContent() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect(routes.login);

  return (
    <AuthShell scene="welcome">
      <h1>Аккаунт</h1>
      <p className={styles.intro}>{user.email}</p>
      <SessionActions canLogoutEverywhere={dataSource === "live"} />
    </AuthShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className={styles.page} aria-busy="true" />}>
      <SettingsContent />
    </Suspense>
  );
}
