import { Marcellus, Archivo } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const marcellus = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const archivo = Archivo({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata = {
  title: "Dxuladiteco — Chocolate artesanal del Istmo de Tehuantepec",
  icons: { icon: "/favicon.svg" },
  description:
    "Chocolate de molino tradicional: tablillas, barras de cacao istmeño, chocolate sin azúcar, repostería y cacao en grano. Del Istmo de Tehuantepec para todo México.",
  openGraph: {
    title: "Dxuladiteco — Chocolate artesanal del Istmo",
    description: "Cacao molido en piedra, canela de Ceilán y el sabor del Istmo en cada tablilla.",
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${marcellus.variable} ${archivo.variable}`}>{children}<Analytics /></body>
    </html>
  );
}
