import type { Metadata, Viewport } from "next";
import GoogleAnalytics from "./components/GoogleAnalytics";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.prife-brasil.com";
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Prife Brasil: iTeraCare e tecnologias de bem-estar",
    template: "%s | Prife Brasil",
  },
  description:
    "Williams Costa Leite, distribuidor independente PRIFE no Brasil: conheça o iTeraCare e as tecnologias de bem-estar Prife e fale direto pelo WhatsApp.",
  applicationName: "Prife Brasil",
  authors: [{ name: "Williams Costa Leite" }],
  creator: "Williams Costa Leite",
  publisher: "Prife Brasil",
  category: "Tecnologia e bem-estar",
  keywords: [
    "Prife Brasil",
    "Williams Costa Leite",
    "tecnologias de bem-estar",
    "iTeraCare Classic Plus",
    "Vitality Energy",
    "Envy Sun",
    "iTera-Bio Lite",
    "Renew Patch",
    "Envy Specs",
    "MagnoSeek",
    "iON Shield",
    "Essência Ocular Vision",
    "Cellfood Plus",
    "Scalar Energy Shield",
    "distribuidor independente Prife",
    "como ser distribuidor Prife",
    "iTeraCare preço",
    "empreendedorismo",
  ],
  alternates: {
    canonical: "/",
  },
  verification: googleVerification ? { google: googleVerification } : undefined,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Prife Brasil",
    title: "Prife Brasil: iTeraCare e tecnologias de bem-estar",
    description:
      "Conheça o iTeraCare e as tecnologias de bem-estar Prife com Williams Costa Leite, distribuidor independente PRIFE.",
    images: [
      {
        url: "/og-prife-brasil.jpg",
        width: 1200,
        height: 630,
        alt: "Prife Brasil: iTeraCare e tecnologias de bem-estar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prife Brasil: iTeraCare e tecnologias de bem-estar",
    description:
      "Conheça o iTeraCare e as tecnologias de bem-estar Prife com um distribuidor independente PRIFE.",
    images: ["/og-prife-brasil.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#01061b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="theme-color" content="#01061b" />
        <meta name="color-scheme" content="dark" />
        <meta name="format-detection" content="telephone=no" />
        <link
          rel="preload"
          href="/fonts/geist-8ac0455e797f/geist-98bbbccb.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/manrope-76eca2803f7f/manrope-81401990.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href="/src/styles.css?v=perf-127" />
      </head>
      <body>
        {children}
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      </body>
    </html>
  );
}
