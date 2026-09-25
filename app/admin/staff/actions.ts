"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireProfile } from "@/lib/auth";
import { getSupabaseUrl } from "@/lib/env";

export type CreateStaffInput = {
  email: string;
  password: string;
  role: "dispatcher" | "hospital" | "driver";
  display_name: string;
  hospital_id: string | null;
  vehicle_label: string | null;
};

export type CreateStaffResult =
  | { ok: true; user_id: string }
  | { ok: false; error: string };

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it in Vercel env (no NEXT_PUBLIC_ prefix).",
    );
  }
  return key;
}

export async function createStaffAccount(
  input: CreateStaffInput,
): Promise<CreateStaffResult> {
  await requireProfile("admin");

  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const displayName = input.display_name.trim();
  const role = input.role;

  if (!email || !password || password.length < 8 || !displayName) {
    return { ok: false, error: "Email, display name, and a password (8+ chars) are required." };
  }
  if (role === "hospital" && !input.hospital_id) {
    return { ok: false, error: "Hospital desk accounts need a hospital." };
  }
  if (role === "driver" && (!input.hospital_id || !input.vehicle_label?.trim())) {
    return {
      ok: false,
      error: "Driver accounts need a hospital and vehicle label.",
    };
  }

  const admin = createServiceClient(getSupabaseUrl(), serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createErr || !data.user) {
    return {
      ok: false,
      error: createErr?.message || "auth.admin.createUser failed.",
    };
  }

  const { error: rpcErr } = await admin.rpc("assign_profile_role", {
    p_user_id: data.user.id,
    p_role: role,
    p_hospital_id: input.hospital_id || null,
    p_display_name: displayName,
    p_vehicle_label:
      role === "driver" ? input.vehicle_label?.trim() || null : null,
  });

  if (rpcErr) {
    return {
      ok: false,
      error: `User created (${data.user.id}) but assign_profile_role failed: ${rpcErr.message}`,
    };
  }

  return { ok: true, user_id: data.user.id };
}
