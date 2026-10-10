/**
 * lib/env.ts
 * Strict environment variable accessors — fail loudly on misconfiguration.
 * Hard-coded fallback literals removed: they appeared in the JS bundle and
 * allowed silent misconfiguration of production deployments.
 *
 * Security fix: MEDIUM-1
 */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured. " +
      "Set it in Vercel → Project Settings → Environment Variables."
    );
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. " +
      "Set it in Vercel → Project Settings → Environment Variables (no NEXT_PUBLIC_ leak of service_role key)."
    );
  }
  return key;
}

export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}
