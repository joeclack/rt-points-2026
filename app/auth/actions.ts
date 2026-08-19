"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/events");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: appAdmin, error: accessError } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (accessError || !appAdmin) {
    await supabase.auth.signOut();
    redirect("/login?error=This%20account%20has%20not%20been%20invited%20as%20an%20admin");
  }

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/admin/events");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
