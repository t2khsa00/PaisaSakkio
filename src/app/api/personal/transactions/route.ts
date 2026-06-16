import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { requireCurrentProfile } from "@/lib/supabase/groups";
import { addPersonalTransaction } from "@/lib/supabase/personal";

export async function POST(request: Request) {
  try {
    const { db, profile } = await requireCurrentProfile();
    const body = await request.json();
    const transaction = await addPersonalTransaction(db, profile.id, body);
    return NextResponse.json({ transaction });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
