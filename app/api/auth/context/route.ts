import { NextResponse } from "next/server";

import { getAuthenticatedContext } from "../../../lib/supabase/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAuthenticatedContext();

  return NextResponse.json(
    {
      authenticated: Boolean(context),
      isAdmin: context?.isAdmin === true,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
