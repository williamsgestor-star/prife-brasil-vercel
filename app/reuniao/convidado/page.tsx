import type { Metadata } from "next";

import GuestMeeting from "./GuestMeeting";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Convite para sala ao vivo", description: "Acesso por convite à sala de reuniões da Equipe iTERACARE Brasil.", robots: { index: false, follow: false } };

export default async function GuestMeetingPage({ searchParams }: { searchParams: Promise<{ convite?: string }> }) {
  const params = await searchParams;
  return <GuestMeeting invite={String(params.convite || "")} />;
}
