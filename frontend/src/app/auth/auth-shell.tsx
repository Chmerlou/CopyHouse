import type { ReactNode } from "react";
import { Card } from "@/shared/ui/ui";
import { PixelSprite } from "../pixel-sprite";
import styles from "./auth.module.css";

export function AuthShell({ scene, children }: {
  scene: "welcome" | "printer" | "kiosk";
  children: ReactNode;
}) {
  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <div className={styles.shell}>
        <Card className={styles.card}>{children}</Card>
        {scene === "welcome" ? (
          <div className={styles.welcome} aria-hidden="true">
            <PixelSprite kind="welcome" loading="eager" />
          </div>
        ) : (
          <PixelSprite kind={scene} className={styles.prop} />
        )}
      </div>
    </main>
  );
}
