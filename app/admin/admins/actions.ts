"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAppOwner } from "@/lib/auth";
import { createAdminClient, getSiteUrl } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function adminsPath(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/admin/admins?${searchParams.toString()}`;
}

async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return { error, user: null };
    }

    const user = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === email,
    );

    if (user || data.users.length < perPage) {
      return { error: null, user: user ?? null };
    }
  }
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

  const { user: existingUser, error: userLookupError } =
    await findAuthUserByEmail(adminClient, email);

  if (userLookupError) {
    redirect(adminsPath({ error: userLookupError.message }));
  }

  if (existingUser) {
    const { data: existingMembership, error: membershipLookupError } =
      await adminClient
        .from("app_admins")
        .select("role")
        .eq("user_id", existingUser.id)
        .maybeSingle();

    if (membershipLookupError) {
      redirect(adminsPath({ error: membershipLookupError.message }));
    }

    if (existingMembership) {
      redirect(adminsPath({ error: `${email} is already an app administrator` }));
    }

    const { error: staleUserDeleteError } =
      await adminClient.auth.admin.deleteUser(existingUser.id);

    if (staleUserDeleteError) {
      redirect(
        adminsPath({
          error: `The previous account for ${email} could not be removed: ${staleUserDeleteError.message}`,
        }),
      );
    }
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

export async function removeAppAdmin(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    redirect(adminsPath({ error: "Select a valid administrator" }));
  }

  const owner = await requireAppOwner();

  if (userId === owner.id) {
    redirect(adminsPath({ error: "The app owner cannot be removed" }));
  }

  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("app_admins")
    .select("role, invited_by")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    redirect(adminsPath({ error: membershipError.message }));
  }

  if (!membership || membership.role !== "admin") {
    redirect(adminsPath({ error: "This administrator cannot be removed" }));
  }

  if (membership.invited_by !== owner.id) {
    redirect(adminsPath({ error: "You can only remove administrators you invited" }));
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch {
    redirect(adminsPath({ error: "Supabase admin credentials are not configured" }));
  }

  const { data: authUser, error: authUserError } =
    await adminClient.auth.admin.getUserById(userId);

  if (authUserError || !authUser.user) {
    redirect(
      adminsPath({
        error: authUserError?.message ?? "The administrator account could not be found",
      }),
    );
  }

  const invitationPending = !authUser.user.last_sign_in_at;
  const { data: transferredCount, error: removalError } = await supabase.rpc(
    "remove_app_admin",
    { p_target_user_id: userId },
  );

  if (removalError) {
    redirect(adminsPath({ error: removalError.message }));
  }

  const { error: deleteUserError } =
    await adminClient.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    revalidatePath("/admin/admins");
    redirect(
      adminsPath({
        error: `Admin access was removed, but the authentication account could not be deleted: ${deleteUserError.message}`,
      }),
    );
  }

  const email = authUser.user.email ?? "the administrator";
  const transferMessage = transferredCount
    ? ` and ${transferredCount} tournament${transferredCount === 1 ? " was" : "s were"} transferred to you`
    : "";

  revalidatePath("/admin/admins");
  revalidatePath("/admin/events");
  redirect(
    adminsPath({
      message: invitationPending
        ? `Invitation to ${email} cancelled`
        : `Admin account for ${email} removed${transferMessage}`,
    }),
  );
}
