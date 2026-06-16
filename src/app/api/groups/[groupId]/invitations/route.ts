import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { addInvitationForOwner, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { groupId } = await params;
    const payload = (await request.json()) as { email?: string };
    const { db, profile } = await requireCurrentProfile();
    const group = await addInvitationForOwner(db, groupId, profile.id, payload.email ?? "");
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
