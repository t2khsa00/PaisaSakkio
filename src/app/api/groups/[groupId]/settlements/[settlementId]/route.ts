import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { deleteSettlementForMember, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string; settlementId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { groupId, settlementId } = await params;
    const { db, profile } = await requireCurrentProfile();
    const group = await deleteSettlementForMember(db, groupId, profile.id, settlementId);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
