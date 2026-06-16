import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { deleteExpenseForMember, requireCurrentProfile, updateExpenseForMember } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string; expenseId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { groupId, expenseId } = await params;
    const { db, profile } = await requireCurrentProfile();
    const group = await deleteExpenseForMember(db, groupId, profile.id, expenseId);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { groupId, expenseId } = await params;
    const payload = await request.json();
    const { db, profile } = await requireCurrentProfile();
    const group = await updateExpenseForMember(db, groupId, profile.id, expenseId, payload);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
