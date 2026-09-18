import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prife Brasil | Williams Costa Leite",
    short_name: "Prife Brasil",
    description:
      "Tecnologias de bem-estar e possibilidades apresentadas por Williams Costa Leite.",
    start_url: "/",
    display: "standalone",
    background_color: "#01061b",
    theme_color: "#01061b",
    lang: "pt-BR",
    icons: [
      {
        src: "/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
