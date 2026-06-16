import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { acceptInvite, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { code } = await params;
    const payload = (await request.json()) as { name?: string; email?: string | null };
    const { db, profile } = await requireCurrentProfile();
    const group = await acceptInvite(db, profile, code, payload.name ?? "", payload.email ?? null);
    return NextResponse.json({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
