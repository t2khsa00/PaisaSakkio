import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { removeMemberForOwner, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string; memberId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { groupId, memberId } = await params;
    const { db, profile } = await requireCurrentProfile();
    const group = await removeMemberForOwner(db, groupId, memberId, profile.id);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
