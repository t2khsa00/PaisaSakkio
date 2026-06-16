import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { leaveGroupForMember, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  try {
    const { groupId } = await params;
    const { db, profile } = await requireCurrentProfile();
    await leaveGroupForMember(db, groupId, profile.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
