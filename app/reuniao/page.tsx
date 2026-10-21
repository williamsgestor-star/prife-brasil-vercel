import type { Metadata } from "next";

import { requireApprovedAccess } from "../lib/supabase/access";
import MeetingRoom from "./MeetingRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sala ao vivo", description: "Sala privada para reuniões, apresentações e treinamentos da Equipe iTERACARE Brasil.", robots: { index: false, follow: false }, manifest: "/apps/sala.webmanifest", appleWebApp: { capable: true, title: "Sala ao vivo", statusBarStyle: "black-translucent" }, icons: { icon: [{ url: "/apps/sala-192.png", sizes: "192x192" }], apple: [{ url: "/apps/sala-180.png", sizes: "180x180" }] } };

export default async function MeetingPage() {
  const user = await requireApprovedAccess("prospector", "/reuniao");
  return <MeetingRoom userDisplayName={user.displayName} canViewRecordingPassword={user.isAdmin} />;
}
