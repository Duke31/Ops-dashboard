export function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://aogknxtyvzpzqkgmgtsv.supabase.co"
  );
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_-SZtZ9gUc3mGdxe5DKxKrA_REbC9iXt"
  );
}

export function isSupabaseConfigured() {
  return true;
}
