import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { requireCurrentProfile } from "@/lib/supabase/groups";
import { addPersonalBill, deletePersonalBill } from "@/lib/supabase/personal";

export async function POST(request: Request) {
  try {
    const { db, profile } = await requireCurrentProfile();
    const { name, amount, currency, category, dueDay } = await request.json();
    const bill = await addPersonalBill(db, profile.id, { name, amount, currency, category, dueDay });
    return NextResponse.json({ bill });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { db, profile } = await requireCurrentProfile();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    await deletePersonalBill(db, profile.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
