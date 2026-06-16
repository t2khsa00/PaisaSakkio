import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-response";
import { getGroupForMember, requireCurrentProfile } from "@/lib/supabase/groups";

type RouteProps = {
  params: Promise<{ groupId: string }>;
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { groupId } = await params;
    const { db, profile } = await requireCurrentProfile();
    await getGroupForMember(db, groupId, profile.id);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a receipt file first." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Receipt must be smaller than 8 MB." }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
    const path = `${groupId}/${profile.id}/${Date.now()}-${safeName}`;
    const bytes = await file.arrayBuffer();
    const { error } = await db.storage.from("receipts").upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: signedData } = await db.storage.from("receipts").createSignedUrl(path, 60 * 60);
    const { data } = db.storage.from("receipts").getPublicUrl(path);

    return NextResponse.json({
      receipt: {
        path,
        url: signedData?.signedUrl ?? data.publicUrl,
        name: file.name,
        type: file.type || "application/octet-stream",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
