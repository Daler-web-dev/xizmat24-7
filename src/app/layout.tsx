import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "XIZMAT24 — Admin",
  description: "Внесение специалистов на платформу XIZMAT24",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Official Telegram runtime: exposes window.Telegram.WebApp and
            injects the --tg-theme-* CSS variables. Must load before hydration. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-tg-bg text-tg-text min-h-screen">
        <Providers>
          <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
