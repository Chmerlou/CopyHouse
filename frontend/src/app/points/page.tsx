import { Suspense } from "react";
import { PointsContent, type PointsSearchParams } from "./points-content";
import styles from "./points.module.css";

export default function PointsPage({ searchParams }: { searchParams: PointsSearchParams }) {
  return (
    <Suspense fallback={<main id="main-content" tabIndex={-1} className={styles.page} aria-busy="true" />}>
      <PointsContent searchParams={searchParams} />
    </Suspense>
  );
}
