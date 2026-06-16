import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { deleteInvitationForOwner, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string; invitationId: string }>;
};

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { groupId, invitationId } = await params;
    const { db, profile } = await requireCurrentProfile();
    const group = await deleteInvitationForOwner(db, groupId, profile.id, invitationId);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
