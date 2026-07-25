import type { ReactNode } from "react";

type ProductShellProps = {
  audience: "clientes" | "administración";
  title: string;
  children: ReactNode;
};

export function ProductShell({ audience, title, children }: ProductShellProps) {
  return (
    <main
      aria-labelledby="page-title"
      style={{ margin: "0 auto", maxWidth: "48rem", padding: "4rem 1.5rem" }}
    >
      <p style={{ color: "#01579b", fontWeight: 700, textTransform: "uppercase" }}>
        PIGAR · {audience}
      </p>
      <h1 id="page-title">{title}</h1>
      {children}
    </main>
  );
}
