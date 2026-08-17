"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSlug } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/server";

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

function eventAdminSectionPath(
  eventId: string,
  section: "access" | "settings",
  params: Record<string, string>,
) {
  const searchParams = new URLSearchParams(params);
  return `/admin/events/${eventId}/${section}?${searchParams.toString()}`;
}

function formatEventDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function parseTeamSize(value: FormDataEntryValue | null) {
  const teamSize = Number(value);
  return Number.isInteger(teamSize) && teamSize >= 2 && teamSize <= 20
    ? teamSize
    : null;
}

function parseFootballMatchMinutes(value: FormDataEntryValue | null) {
  const minutes = Number(value);

  return Number.isInteger(minutes) &&
    minutes >= 2 &&
    minutes <= 180 &&
    minutes % 2 === 0
    ? minutes
    : null;
}

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const dateLabel = formatEventDate(eventDate);
  const location = String(formData.get("location") ?? "").trim();
  const teamSize = parseTeamSize(formData.get("team_size"));
  const sport = String(formData.get("sport") ?? "");

  if (!name) {
    redirect("/admin/events/new?error=Tournament%20name%20is%20required");
  }

  if (!dateLabel) {
    redirect("/admin/events/new?error=Choose%20a%20valid%20tournament%20date");
  }

  if (!teamSize) {
    redirect("/admin/events/new?error=Team%20size%20must%20be%20between%202%20and%2020");
  }
  if (!["football", "basketball"].includes(sport)) {
    redirect("/admin/events/new?error=Choose%20a%20tournament%20sport");
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
      date_label: dateLabel,
      location: location || null,
      visibility: "public",
      football_enabled: true,
      team_size: teamSize,
      sport: sport as "football" | "basketball",
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

export async function updateEventDetails(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const dateLabel = formatEventDate(eventDate);
  const location = String(formData.get("location") ?? "").trim();
  const teamSize = parseTeamSize(formData.get("team_size"));
  const matchMinutesValue = formData.get("football_match_minutes");
  const footballMatchMinutes =
    matchMinutesValue === null
      ? null
      : parseFootballMatchMinutes(matchMinutesValue);

  if (!eventId) {
    redirect("/admin/events?error=Missing%20tournament");
  }

  if (!name) {
    redirect(eventAdminSectionPath(eventId, "settings", { error: "Tournament name is required" }));
  }

  if (!dateLabel) {
    redirect(eventAdminSectionPath(eventId, "settings", { error: "Choose a valid tournament date" }));
  }

  if (!location) {
    redirect(eventAdminSectionPath(eventId, "settings", { error: "Location is required" }));
  }


  if (!teamSize) {
    redirect(eventAdminSectionPath(eventId, "settings", { error: "Team size must be between 2 and 20" }));
  }

  if (matchMinutesValue !== null && !footballMatchMinutes) {
    redirect(eventAdminSectionPath(eventId, "settings", { error: "Football match length must be an even number between 2 and 180 minutes" }));
  }

  const { supabase } = await requireUser();
  const { data: event, error } = await supabase
    .from("events")
    .update({
      name,
      description: description || null,
      date_label: dateLabel,
      location,
      team_size: teamSize,
      ...(footballMatchMinutes
        ? { football_match_minutes: footballMatchMinutes }
        : {}),
    })
    .eq("id", eventId)
    .select("slug,sport")
    .single();

  if (error || !event) {
    redirect(
      eventAdminSectionPath(eventId, "settings", {
        error: error?.message ?? "Unable to update tournament",
      }),
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${event.slug}`);
  revalidatePath(`/events/${event.slug}/${event.sport}`);
  redirect(eventAdminSectionPath(eventId, "settings", { message: "Tournament details saved" }));
}

export async function archiveEvent(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    redirect("/admin/events?error=Missing%20tournament");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("set_event_archived", {
    p_archived: true,
    p_event_id: eventId,
  });

  if (error || !data) {
    redirect(eventAdminSectionPath(eventId, "settings", {
      error: error?.message ?? "Unable to archive tournament",
    }));
  }

  const event = data as { slug: string; sport: "football" | "basketball" };

  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath(`/events/${event.slug}/${event.sport}`);
  redirect("/admin/events?message=Tournament%20archived");
}

export async function restoreEvent(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    redirect("/admin/events?error=Missing%20tournament");
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("set_event_archived", {
    p_archived: false,
    p_event_id: eventId,
  });

  if (error || !data) {
    redirect(`/admin/events?error=${encodeURIComponent(error?.message ?? "Unable to restore tournament")}`);
  }

  const event = data as { slug: string; sport: "football" | "basketball" };

  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${event.slug}`);
  revalidatePath(`/events/${event.slug}/${event.sport}`);
  redirect(`/admin/events/${eventId}/settings?message=Tournament%20restored`);
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
        `/admin/events/${eventId}/access?error=${encodeURIComponent(error.message)}`,
      );
    }

    redirect(`/admin/events/${eventId}/access?message=Access%20code%20cleared`);
  }

  const { error } = await supabase.from("event_viewer_access_codes").upsert({
    event_id: eventId,
    access_code: accessCode,
  });

  if (error) {
    redirect(
      `/admin/events/${eventId}/access?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/admin/events/${eventId}/access?message=Access%20code%20saved`);
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
    redirect(eventAdminSectionPath(eventId, "access", { error: error.message }));
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(eventAdminSectionPath(eventId, "access", { message: "Admin access granted" }));
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
    redirect(eventAdminSectionPath(eventId, "access", { error: error.message }));
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(eventAdminSectionPath(eventId, "access", { message: "Admin access removed" }));
}
