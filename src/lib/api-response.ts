import { NextResponse } from "next/server";
import { ApiError } from "@/lib/supabase/groups";

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Something went wrong." },
    { status: 500 },
  );
}
