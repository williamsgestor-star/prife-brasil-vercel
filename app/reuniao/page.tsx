import type { Metadata } from "next";

import { requireApprovedAccess } from "../lib/supabase/access";
import MeetingRoom from "./MeetingRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sala ao vivo", description: "Sala privada para reuniões, apresentações e treinamentos da Equipe iTERACARE Brasil.", robots: { index: false, follow: false } };

export default async function MeetingPage() {
  const user = await requireApprovedAccess("prospector", "/reuniao");
  return <MeetingRoom userDisplayName={user.displayName} canViewRecordingPassword={user.isAdmin} />;
}
