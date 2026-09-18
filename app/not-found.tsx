import type { Metadata } from "next";

import NotFoundContent from "./components/NotFoundContent";

export const metadata: Metadata = { title: "Página não encontrada", description: "A página solicitada não foi encontrada no site Prife Brasil.", robots: { index: false, follow: true } };

export default function NotFound() { return <NotFoundContent />; }
