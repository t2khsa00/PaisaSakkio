import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { listGroupSummariesForProfile, requireCurrentProfile } from "@/lib/supabase/groups";

export async function GET() {
  try {
    const { db, profile } = await requireCurrentProfile();
    const groups = await listGroupSummariesForProfile(db, profile.id);
    return NextResponse.json({ groups });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
