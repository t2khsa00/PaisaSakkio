import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { getInviteGroup, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { code } = await params;
    const { db, profile } = await requireCurrentProfile();
    const group = await getInviteGroup(db, code);
    const alreadyMember = group.members.some((member) => member.id === profile.id);
    return NextResponse.json({ group, alreadyMember });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
