import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { routeForUser } from "@/shared/auth/contracts";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { OrderView } from "./order-view";
import { PixelSprite } from "../../pixel-sprite";
import styles from "../../order-flow.module.css";

type Props = { params: Promise<{ orderId: string }>; searchParams: Promise<{ payment?: string | string[] }> };

export default function OrderPage(props: Props) {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className={styles.page} aria-busy="true" />}>
      <ProtectedOrder {...props} />
    </Suspense>
  );
}
async function ProtectedOrder({ params, searchParams }: Props) {
  await connection();
  const [user, { orderId }, { payment }] = await Promise.all([getCurrentUser(), params, searchParams]);
  const paymentRetry = payment === "retry";
  const returnTo = `${routes.order(orderId)}${paymentRetry ? "?payment=retry" : ""}`;
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(returnTo)}`);
  if (user.role !== "CLIENT") redirect(routeForUser(user));
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.layout}>
          <OrderView key={orderId} orderId={orderId} paymentRetry={paymentRetry} />
          <PixelSprite kind="printer" className={styles.scene} />
        </div>
      </div>
    </main>
  );
}
