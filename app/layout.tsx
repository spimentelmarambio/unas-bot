import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MartiNails",
  description: "Bot de WhatsApp para registrar ingresos y gastos de MartiNails",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
