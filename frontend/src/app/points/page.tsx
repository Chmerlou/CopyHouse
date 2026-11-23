import Link from "next/link";
import { routes } from "@/shared/routes";
import { Card } from "@/shared/ui/ui";
import styles from "../auth/auth.module.css";

export default function PointsPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.brand} href={routes.home}>COPYHOUSE</Link>
        <Card className={styles.card}>
          <h1>Точки печати</h1>
          <p className={styles.intro}>
            Маршрут каталога готов. Список, состояния и выбор точки — следующий этап.
          </p>
          <Link href={routes.home}>Вернуться на главную</Link>
        </Card>
      </div>
    </main>
  );
}
