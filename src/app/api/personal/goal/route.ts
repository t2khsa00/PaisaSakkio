import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { requireCurrentProfile } from "@/lib/supabase/groups";
import { setPersonalGoal } from "@/lib/supabase/personal";

export async function PUT(request: Request) {
  try {
    const { db, profile } = await requireCurrentProfile();
    const { amount, currency } = await request.json();
    await setPersonalGoal(db, profile.id, amount, currency);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
