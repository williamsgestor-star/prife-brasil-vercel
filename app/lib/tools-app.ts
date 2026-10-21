import type { Metadata } from "next";

// Um app só no celular ("Prife Ferramentas"): todas as ferramentas usam o mesmo manifesto.
export const toolsAppMetadata: Pick<Metadata, "manifest" | "appleWebApp" | "icons"> = {
  manifest: "/apps/ferramentas.webmanifest",
  appleWebApp: { capable: true, title: "Prife Ferramentas", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/apps/ferramentas-192.png", sizes: "192x192" }],
    apple: [{ url: "/apps/ferramentas-180.png", sizes: "180x180" }],
  },
};
