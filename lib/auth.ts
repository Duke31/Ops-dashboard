import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";
import { homeForRole } from "@/lib/roles";

export async function requireProfile(expected?: AppRole | AppRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, role, hospital_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle<Profile>();

  if (error || !profile) redirect("/login?error=no-role");

  profile.email = user.email ?? null;

  if (expected) {
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(profile.role) && profile.role !== "admin") {
      redirect(homeForRole(profile.role));
    }
  }

  return { supabase, user, profile };
}
