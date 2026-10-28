import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { themeScript } from "@/lib/theme-script";
import { CookieConsent } from "@/components/cookie-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FalconTeams · Control horario",
  description: "Registro de jornada y seguimiento de empleados",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Tema claro/oscuro antes del primer pintado */}
        <Script id="theme" strategy="beforeInteractive">{themeScript}</Script>
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        {/* Aviso de cookies; la analítica de falcondatabase solo se carga si se acepta. */}
        <CookieConsent />
      </body>
    </html>
  );
}
