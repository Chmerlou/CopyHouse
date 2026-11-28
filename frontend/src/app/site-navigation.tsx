"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { routes } from "@/shared/routes";
import styles from "./site-header.module.css";

export function NavigationBar({ children, compact = false, pathname = "" }: {
  children: ReactNode;
  compact?: boolean;
  pathname?: string;
}) {
  const [openOn, setOpenOn] = useState<string | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const open = compact && openOn === pathname;

  return (
    <div className={`${styles.inner} ${compact ? styles.compact : ""}`} data-menu-open={open}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpenOn(null);
          toggle.current?.focus();
        }
      }}>
      <Link className={styles.logo} href={routes.home} aria-label="CopyHouse, главная" onClick={() => setOpenOn(null)}>COPYHOUSE</Link>
      <button type="button" ref={toggle} className={styles.menuToggle} aria-expanded={open} aria-controls="site-navigation"
        onClick={() => setOpenOn(open ? null : pathname)}>Меню</button>
      <nav id="site-navigation" className={styles.nav} aria-label="Основная навигация"
        onClick={(event) => { if (event.target instanceof Element && event.target.closest("a")) setOpenOn(null); }}>
        {children}
      </nav>
    </div>
  );
}

export function SiteNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <NavigationBar compact={pathname !== routes.home} pathname={pathname}>{children}</NavigationBar>;
}
