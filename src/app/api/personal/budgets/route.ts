import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { requireCurrentProfile } from "@/lib/supabase/groups";
import { deletePersonalBudget, setPersonalBudget } from "@/lib/supabase/personal";

export async function PUT(request: Request) {
  try {
    const { db, profile } = await requireCurrentProfile();
    const { category, amount, currency } = await request.json();
    await setPersonalBudget(db, profile.id, category, amount, currency);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { db, profile } = await requireCurrentProfile();
    const category = new URL(request.url).searchParams.get("category") ?? "";
    await deletePersonalBudget(db, profile.id, category);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
