import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "PIGAR | Portal de clientes",
  description: "Portal de clientes de PIGAR",
};

export default function CustomerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
