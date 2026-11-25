import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { OrderView } from "./order-view";
import { PixelSprite } from "../../pixel-sprite";
import styles from "../../order-flow.module.css";

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className={styles.page} aria-busy="true" />}>
      <ProtectedOrder params={params} />
    </Suspense>
  );
}
async function ProtectedOrder({ params }: { params: Promise<{ orderId: string }> }) {
  await connection();
  const [user, { orderId }] = await Promise.all([getCurrentUser(), params]);
  const returnTo = routes.order(orderId);
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(returnTo)}`);
  if (user.role !== "CLIENT") redirect(routes.provider);
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.layout}>
          <OrderView orderId={orderId} />
          <PixelSprite kind="printer" className={styles.scene} />
        </div>
      </div>
    </main>
  );
}
