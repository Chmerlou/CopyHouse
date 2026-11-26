"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { routes } from "@/shared/routes";
import { Button } from "@/shared/ui/ui";
import styles from "../../auth/auth.module.css";

export function SessionActions({ canLogoutEverywhere }: { canLogoutEverywhere: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout(everywhere: boolean) {
    if (pending || (everywhere && !window.confirm("Выйти со всех устройств? Для доступа к аккаунту на каждом из них нужно будет войти снова."))) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(everywhere ? "/api/auth/logout/all" : "/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError(response.status === 401 ? "Войдите в аккаунт снова, чтобы повторить действие." : "Не удалось выйти из аккаунта. Попробуйте ещё раз.");
        return;
      }
      router.replace(routes.login);
      router.refresh();
    } catch {
      setError("Не удалось выйти из аккаунта. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.form} aria-busy={pending}>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => logout(false)}>
        Выйти на этом устройстве
      </Button>
      {canLogoutEverywhere && (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => logout(true)}>
          Выйти со всех устройств
        </Button>
      )}
      {error && <p className={styles.formError} role="alert">{error}</p>}
    </div>
  );
}
