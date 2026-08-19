import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return NextResponse.json(
      { error: "Your invitation session could not be verified. Open the invite link again." },
      { status: 401 },
    );
  }

  const { password } = (await request.json().catch(() => ({}))) as {
    password?: unknown;
  };

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Use at least 8 characters for your password." },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Your invitation session has expired. Open a fresh invite link and try again." },
      { status: 401 },
    );
  }

  const { data: appAdmin, error: accessError } = await adminClient
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accessError) {
    return NextResponse.json(
      { error: "The invitation could not be checked. Try again in a moment." },
      { status: 500 },
    );
  }

  if (!appAdmin) {
    return NextResponse.json(
      { error: "This account has not been invited as a tournament admin." },
      { status: 403 },
    );
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    user.id,
    { password },
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
