"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole } from "@/lib/roles";
import type { Profile } from "@/lib/types";

export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = formData.get("email")?.toString()?.trim() || "";
  const password = formData.get("password")?.toString() || "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    return { error: error?.message || "Invalid login credentials." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, role, hospital_id, display_name")
    .eq("user_id", data.user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    return { error: `Profile error: ${profileError.message}` };
  }

  if (!profile || !profile.role || profile.role === "client") {
    // Sign out unauthorized session so they don't persist
    await supabase.auth.signOut();
    return {
      error: "Unauthorized: This portal is restricted to authorized operational staff. Access denied.",
    };
  }

  redirect(homeForRole(String(profile.role)));
}
