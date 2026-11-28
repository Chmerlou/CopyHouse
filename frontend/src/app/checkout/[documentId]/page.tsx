import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { routeForUser } from "@/shared/auth/contracts";
import { getCurrentUser } from "@/shared/auth/server";
import { routes } from "@/shared/routes";
import { CheckoutForm } from "./checkout-form";
import { PixelSprite } from "../../pixel-sprite";
import styles from "../../order-flow.module.css";

export default function CheckoutPage({ params }: { params: Promise<{ documentId: string }> }) {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className={styles.page} aria-busy="true" />}>
      <ProtectedCheckout params={params} />
    </Suspense>
  );
}

async function ProtectedCheckout({ params }: { params: Promise<{ documentId: string }> }) {
  await connection();
  const [user, { documentId }] = await Promise.all([getCurrentUser(), params]);
  const returnTo = routes.checkout(documentId);
  if (!user) redirect(`${routes.login}?returnTo=${encodeURIComponent(returnTo)}`);
  if (user.role !== "CLIENT") redirect(routeForUser(user));
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <div className="work-toolbar">
          <Link className={styles.back} href={routes.orderPoints(documentId)}>Назад к выбору точки</Link>
          <p className="work-step">Шаг 4 из 4</p>
        </div>
        <div className={styles.layout}>
          <CheckoutForm documentId={documentId} />
          <PixelSprite kind="paper" className={`${styles.scene} ${styles.checkoutScene}`} />
        </div>
      </div>
    </main>
  );
}
