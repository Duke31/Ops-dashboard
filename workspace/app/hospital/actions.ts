"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireProfile } from "@/lib/auth";
import { getSupabaseUrl } from "@/lib/env";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set on the server.",
    );
  }
  return key;
}

function getAdminClient() {
  return createServiceClient(getSupabaseUrl(), serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Safely updates hospital ER bed capacity
 */
export async function updateHospitalCapacityAction({
  hospitalId,
  capacity,
}: {
  hospitalId: string;
  capacity: number;
}) {
  const { profile } = await requireProfile(["hospital", "admin", "dispatcher"]);

  // If role is hospital, ensure they are updating their own hospital
  if (profile.role === "hospital" && profile.hospital_id && profile.hospital_id !== hospitalId) {
    return { ok: false, error: "Unauthorized: You can only update your own facility." };
  }

  const admin = getAdminClient();
  const safeCap = Math.max(0, capacity);

  const { error } = await admin
    .from("hospitals")
    .update({ available_capacity: safeCap })
    .eq("id", hospitalId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, newCapacity: safeCap };
}

/**
 * Dedicated ER Patient Admission Action:
 * 1. Decrements hospital available_capacity by 1
 * 2. Saves Bed/Bay allocation and triage notes to emergency request
 * 3. Transitions state to Completed
 */
export async function admitHospitalPatientAction({
  requestId,
  hospitalId,
  assignedBay,
  notes,
}: {
  requestId: string;
  hospitalId: string;
  assignedBay: string;
  notes?: string;
}) {
  const { profile } = await requireProfile(["hospital", "admin", "dispatcher"]);

  if (profile.role === "hospital" && profile.hospital_id && profile.hospital_id !== hospitalId) {
    return { ok: false, error: "Unauthorized: You can only admit patients to your own facility." };
  }

  const admin = getAdminClient();

  // 1. Fetch current capacity and decrement atomically
  const { data: hosp } = await admin
    .from("hospitals")
    .select("available_capacity")
    .eq("id", hospitalId)
    .maybeSingle();

  const currentCap = hosp?.available_capacity ?? 0;
  const newCap = Math.max(0, currentCap - 1);

  await admin
    .from("hospitals")
    .update({ available_capacity: newCap })
    .eq("id", hospitalId);

  // 2. Fetch existing request notes and append admission bed record
  const { data: req } = await admin
    .from("emergency_requests")
    .select("notes, status")
    .eq("id", requestId)
    .maybeSingle();

  const admissionStamp = `[Admitted to ${assignedBay} at ${new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}]${notes?.trim() ? ` Notes: ${notes.trim()}` : ""}`;

  const updatedNotes = req?.notes
    ? `${req.notes}\n${admissionStamp}`
    : admissionStamp;

  await admin
    .from("emergency_requests")
    .update({
      notes: updatedNotes,
      status: "Completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  return {
    ok: true,
    newCapacity: newCap,
    assignedBay,
  };
}
