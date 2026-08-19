import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export function isSupabaseConfigured() {
  if (process.env.RT_POINTS_USE_SAMPLE_DATA === "true") {
    return false;
  }

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export const requireAdminUser = cache(async function requireAdminUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) {
    redirect("/login");
  }

  const { data: appAdmin, error: accessError } = await supabase
    .from("app_admins")
    .select("role")
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  if (accessError || !appAdmin) {
    redirect("/unauthorized");
  }

  return { id: data.claims.sub, role: appAdmin.role };
});

export async function requireAppOwner() {
  const user = await requireAdminUser();

  if (!user || user.role !== "owner") {
    redirect("/admin/events?error=Only%20the%20app%20owner%20can%20invite%20admins");
  }

  return user;
}
