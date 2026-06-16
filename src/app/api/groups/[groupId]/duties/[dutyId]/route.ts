import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { deleteDutyForMember, requireCurrentProfile, updateDutyForMember } from "@/lib/supabase/groups";
import type { Duty } from "@/lib/types";

type RouteProps = {
  params: Promise<{ groupId: string; dutyId: string }>;
};

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { groupId, dutyId } = await params;
    const payload = (await request.json()) as Partial<Omit<Duty, "id">>;
    const { db, profile } = await requireCurrentProfile();
    const group = await updateDutyForMember(db, groupId, profile.id, dutyId, payload);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { groupId, dutyId } = await params;
    const { db, profile } = await requireCurrentProfile();
    const group = await deleteDutyForMember(db, groupId, profile.id, dutyId);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
