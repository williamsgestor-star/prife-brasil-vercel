import type { Metadata } from "next";

import AppHomeButton from "../components/AppHomeButton";
import { requireApprovedAccess } from "../lib/supabase/access";
import { toolsAppMetadata } from "../lib/tools-app";
import MeetingRoom from "./MeetingRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sala ao vivo", description: "Sala privada para reuniões, apresentações e treinamentos da Equipe iTERACARE Brasil.", robots: { index: false, follow: false }, ...toolsAppMetadata };

export default async function MeetingPage() {
  const user = await requireApprovedAccess("prospector", "/reuniao");
  return <><AppHomeButton /><MeetingRoom userDisplayName={user.displayName} canViewRecordingPassword={user.isAdmin} /></>;
}
