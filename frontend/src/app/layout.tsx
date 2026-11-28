import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "CopyHouse | Печать PDF",
  description:
    "Сравните цены на печать PDF в копицентрах вашего города и оформите заказ онлайн.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body><SiteHeader />{children}</body>
    </html>
  );
}
