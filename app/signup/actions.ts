"use server";

import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/env";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required on server.");
  }
  return key;
}

export type SignupActionState = {
  error?: string;
  success?: boolean;
  isStaffReview?: boolean;
  referenceId?: string;
  roleTitle?: string;
  facilityName?: string;
} | null;

export async function signupClientAction(
  prevState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const fullName = formData.get("full_name")?.toString()?.trim() || "";
  const email = formData.get("email")?.toString()?.trim()?.toLowerCase() || "";
  const phone = formData.get("phone")?.toString()?.trim() || "";
  const password = formData.get("password")?.toString() || "";
  const bloodGroup = formData.get("blood_group")?.toString()?.trim() || "";
  const allergies = formData.get("allergies")?.toString()?.trim() || "";
  const isMaternalCare = formData.get("is_maternal_care") === "on";

  if (!fullName) {
    return { error: "Full name is required." };
  }
  if (!email || !email.includes("@")) {
    return { error: "A valid email address is required." };
  }
  if (!phone || phone.length < 8) {
    return { error: "A valid contact phone number is required for emergency dispatch." };
  }
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  const admin = createServiceClient(getSupabaseUrl(), serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
    },
  });

  if (authError || !authData?.user) {
    if (authError?.message?.toLowerCase().includes("already")) {
      return {
        error: "An account with this email already exists. You can sign in directly on the mobile app.",
      };
    }
    return { error: authError?.message || "Failed to create membership account." };
  }

  const userId = authData.user.id;

  // 2. Upsert profile with client role
  const chronicNotes = isMaternalCare
    ? "Active Maternal Care / Priority Transport Enrollment"
    : null;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      role: "client",
      display_name: fullName,
      full_name: fullName,
      phone: phone,
      blood_group: bloodGroup || null,
      allergies: allergies || null,
      chronic_conditions: chronicNotes,
      age_band: "18-39",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    console.error("Error creating client profile:", profileError);
    return {
      error: `Account created but profile configuration failed: ${profileError.message}`,
    };
  }

  // 3. Redirect to download page with personal onboarding banner
  redirect("/download?registered=1&name=" + encodeURIComponent(fullName));
}

export async function signupStaffAction(
  prevState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const fullName = formData.get("full_name")?.toString()?.trim() || "";
  const email = formData.get("email")?.toString()?.trim()?.toLowerCase() || "";
  const phone = formData.get("phone")?.toString()?.trim() || "";
  const password = formData.get("password")?.toString() || "";
  const requestedRole = formData.get("requested_role")?.toString()?.trim() || "hospital";
  const facilityName = formData.get("facility_name")?.toString()?.trim() || "";
  const licenseNumber = formData.get("license_number")?.toString()?.trim() || "";

  if (!fullName) {
    return { error: "Full legal name is required." };
  }
  if (!email || !email.includes("@")) {
    return { error: "A valid institutional or professional email address is required." };
  }
  if (!phone || phone.length < 8) {
    return { error: "A valid direct contact phone number is required." };
  }
  if (!facilityName) {
    return { error: "Healthcare facility or EMS organization name is required." };
  }
  if (!password || password.length < 8) {
    return { error: "Staff account passwords must be at least 8 characters long." };
  }

  const admin = createServiceClient(getSupabaseUrl(), serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
      staff_role_requested: requestedRole,
      facility_name: facilityName,
    },
  });

  if (authError || !authData?.user) {
    if (authError?.message?.toLowerCase().includes("already")) {
      return {
        error: "An account with this email address already exists. Please log in or contact your facility administrator.",
      };
    }
    return { error: authError?.message || "Failed to submit staff registration." };
  }

  const userId = authData.user.id;
  const referenceId = "SOL-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  // Create profile under client role with pending staff review metadata
  const reviewNote = `[STAFF_APPLICATION_PENDING] Role: ${requestedRole} | Facility: ${facilityName} | License: ${licenseNumber || "N/A"} | Ref: ${referenceId} | Submitted: ${new Date().toISOString()}`;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      role: "client",
      display_name: fullName,
      full_name: fullName,
      phone: phone,
      chronic_conditions: reviewNote,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    console.error("Error creating staff pending profile:", profileError);
    return {
      error: `Registration recorded but profile assignment failed: ${profileError.message}`,
    };
  }

  const roleTitleMap: Record<string, string> = {
    dispatcher: "Emergency Operations & Mission Orchestration",
    hospital: "Hospital ER Receiving & Triage Bay",
    driver: "Certified Field Paramedic & Mobile Responder",
  };

  return {
    success: true,
    isStaffReview: true,
    referenceId,
    roleTitle: roleTitleMap[requestedRole] || requestedRole,
    facilityName,
  };
}
