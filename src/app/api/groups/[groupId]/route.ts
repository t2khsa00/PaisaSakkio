import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { deleteGroupForOwner, getGroupForMember, renameGroupForOwner, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  try {
    const { groupId } = await params;
    const { db, profile } = await requireCurrentProfile();
    const group = await getGroupForMember(db, groupId, profile.id);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const { groupId } = await params;
    const { db, profile } = await requireCurrentProfile();
    await deleteGroupForOwner(db, groupId, profile.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { groupId } = await params;
    const { db, profile } = await requireCurrentProfile();
    const body = await request.json();
    const group = await renameGroupForOwner(db, groupId, profile.id, String(body.name ?? ""));
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
