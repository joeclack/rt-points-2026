"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppOwner } from "@/lib/auth";
import { createAdminClient, getSiteUrl } from "@/lib/supabase/admin";

function adminsPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/admin/admins?${searchParams.toString()}`;
}

export async function inviteAppAdmin(formData: FormData) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    redirect(adminsPath({ error: "Enter a valid email address" }));
  }

  const owner = await requireAppOwner();

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    redirect(adminsPath({ error: "Supabase admin credentials are not configured" }));
  }

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: displayName ? { display_name: displayName } : undefined,
    redirectTo: `${getSiteUrl()}/invite/accept`,
  });

  if (error || !data.user) {
    redirect(adminsPath({ error: error?.message ?? "Unable to send invitation" }));
  }

  const { error: membershipError } = await adminClient.from("app_admins").insert({
    invited_by: owner.id,
    role: "admin",
    user_id: data.user.id,
  });

  if (membershipError) {
    await adminClient.auth.admin.deleteUser(data.user.id);
    redirect(adminsPath({ error: "The invitation could not be authorised. No account was kept." }));
  }

  revalidatePath("/admin/admins");
  redirect(adminsPath({ message: `Invitation sent to ${email}` }));
}
