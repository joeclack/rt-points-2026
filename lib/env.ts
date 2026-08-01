export function getSupabaseEnv() {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

function normalizeSupabaseUrl(url?: string) {
  return url?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}
