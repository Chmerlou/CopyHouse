import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "CopyHouse | Печать рядом",
  description:
    "Сравните копицентры рядом, узнайте цену печати и отправьте документ в заказ.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body><SiteHeader />{children}</body>
    </html>
  );
}
