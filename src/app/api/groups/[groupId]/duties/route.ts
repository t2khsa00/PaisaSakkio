import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { addDutyForMember, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { groupId } = await params;
    const payload = await request.json();
    const { db, profile } = await requireCurrentProfile();
    const group = await addDutyForMember(db, groupId, profile.id, payload);
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
