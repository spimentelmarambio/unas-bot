import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uñas Bot",
  description: "Bot de WhatsApp para registrar ingresos de servicios de uñas",
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
