import Link from "next/link";
import { routes } from "@/shared/routes";
import { AuthShell } from "./auth/auth-shell";

export default function NotFound() {
  return (
    <AuthShell scene="kiosk">
      <h1>Страница не найдена</h1>
      <p className="missing-page-copy">Проверьте адрес страницы или <Link href={routes.home}>перейдите на главную</Link>.</p>
    </AuthShell>
  );
}
