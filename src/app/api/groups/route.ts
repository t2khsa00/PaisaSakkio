import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { createGroupForProfile, listGroupsForProfile, requireCurrentProfile } from "@/lib/supabase/groups";

export async function GET() {
  try {
    const { db, profile } = await requireCurrentProfile();
    const groups = await listGroupsForProfile(db, profile.id);
    return NextResponse.json({ groups });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { name?: string; currency?: string };
    const { db, profile } = await requireCurrentProfile();
    const group = await createGroupForProfile(db, profile, payload.name ?? "", payload.currency ?? "EUR");
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
