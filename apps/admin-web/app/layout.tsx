import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "PIGAR | Administración",
  description: "Backoffice de PIGAR",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
