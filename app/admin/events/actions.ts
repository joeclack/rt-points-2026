"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSlug } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/server";

function eventAdminPath(eventId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/admin/events/${eventId}?${searchParams.toString()}`;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const dateLabel = String(formData.get("date_label") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!name) {
    redirect("/admin/events/new?error=Tournament%20name%20is%20required");
  }

  const { supabase, user } = await requireUser();

  const slug = createSlug(name);
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      name,
      slug,
      description: description || null,
      date_label: dateLabel || null,
      location: location || null,
      visibility: "public",
      football_enabled: true,
    })
    .select("id")
    .single();

  if (error || !event) {
    redirect(
      `/admin/events/new?error=${encodeURIComponent(
        error?.message ?? "Unable to create tournament",
      )}`,
    );
  }

  redirect(`/admin/events/${event.id}`);
}

export async function updateViewerAccessCode(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const accessCode = String(formData.get("access_code") ?? "").trim();

  if (!eventId) {
    redirect("/admin/events?error=Missing%20tournament");
  }

  const { supabase } = await requireUser();

  if (!accessCode) {
    const { error } = await supabase
      .from("event_viewer_access_codes")
      .delete()
      .eq("event_id", eventId);

    if (error) {
      redirect(
        `/admin/events/${eventId}?error=${encodeURIComponent(error.message)}`,
      );
    }

    redirect(`/admin/events/${eventId}?message=Access%20code%20cleared`);
  }

  const { error } = await supabase.from("event_viewer_access_codes").upsert({
    event_id: eventId,
    access_code: accessCode,
  });

  if (error) {
    redirect(
      `/admin/events/${eventId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/admin/events/${eventId}?message=Access%20code%20saved`);
}

export async function grantEventAdmin(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!eventId || !userId) {
    redirect("/admin/events?error=Missing%20tournament%20or%20admin");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase.from("event_admins").upsert(
    {
      event_id: eventId,
      user_id: userId,
      role: "admin",
    },
    {
      onConflict: "event_id,user_id",
      ignoreDuplicates: true,
    },
  );

  if (error) {
    redirect(eventAdminPath(eventId, { error: error.message }));
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(eventAdminPath(eventId, { message: "Admin access granted" }));
}

export async function revokeEventAdmin(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!eventId || !userId) {
    redirect("/admin/events?error=Missing%20tournament%20or%20admin");
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("event_admins")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("role", "admin");

  if (error) {
    redirect(eventAdminPath(eventId, { error: error.message }));
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(eventAdminPath(eventId, { message: "Admin access removed" }));
}
