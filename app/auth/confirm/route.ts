import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { runConfirm } from "@/lib/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const supabase = await createSupabaseServerClient();
  const { to } = await runConfirm(
    {
      tokenHash: params.get("token_hash"),
      type: params.get("type"),
      code: params.get("code"),
      next: params.get("next"),
    },
    supabase ? supabase.auth : null,
  );
  redirect(to);
}
