import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { requireCurrentProfile } from "@/lib/supabase/groups";
import { deletePersonalTransaction, updatePersonalTransaction } from "@/lib/supabase/personal";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { db, profile } = await requireCurrentProfile();
    const body = await request.json();
    const transaction = await updatePersonalTransaction(db, profile.id, id, body);
    return NextResponse.json({ transaction });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;
    const { db, profile } = await requireCurrentProfile();
    await deletePersonalTransaction(db, profile.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
