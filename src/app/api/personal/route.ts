import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { requireCurrentProfile } from "@/lib/supabase/groups";
import { listPersonalData } from "@/lib/supabase/personal";

export async function GET() {
  try {
    const { db, profile } = await requireCurrentProfile();
    const data = await listPersonalData(db, profile.id);
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
