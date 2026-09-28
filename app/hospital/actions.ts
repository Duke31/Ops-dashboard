"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireProfile } from "@/lib/auth";
import { getSupabaseUrl } from "@/lib/env";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it in Vercel env.",
    );
  }
  return key;
}

export type AdmitPatientInput = {
  requestId: string;
  hospitalId: string;
  assignedBay: string;
  notes?: string;
};

export type AdmitPatientResult =
  | { ok: true; newCapacity: number | null }
  | { ok: false; error: string };

export async function admitHospitalPatientAction(
  input: AdmitPatientInput,
): Promise<AdmitPatientResult> {
  const { profile } = await requireProfile(["hospital", "admin", "dispatcher"]);

  const admin = createServiceClient(getSupabaseUrl(), serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Fetch current hospital capacity and decrement safely
    let newCapacity: number | null = null;
    const { data: hosp } = await admin
      .from("hospitals")
      .select("available_capacity")
      .eq("id", input.hospitalId)
      .maybeSingle();

    if (hosp && hosp.available_capacity != null) {
      newCapacity = Math.max(0, hosp.available_capacity - 1);
      const { error: hospErr } = await admin
        .from("hospitals")
        .update({ available_capacity: newCapacity })
        .eq("id", input.hospitalId);

      if (hospErr) {
        console.error("Failed to decrement capacity:", hospErr);
      }
    }

    // 2. Fetch existing request notes and append the admission bay stamp
    const { data: req } = await admin
      .from("emergency_requests")
      .select("notes")
      .eq("id", input.requestId)
      .maybeSingle();

    const admissionStamp = `[Admitted to ${input.assignedBay} at ${new Date().toLocaleTimeString()} by ${
      profile.display_name || "ER Desk"
    }]${input.notes?.trim() ? ` Notes: ${input.notes.trim()}` : ""}`;

    const updatedNotes = req?.notes
      ? `${req.notes}\n${admissionStamp}`
      : admissionStamp;

    // 3. Mark the emergency request as Completed and save notes
    const { error: reqErr } = await admin
      .from("emergency_requests")
      .update({
        notes: updatedNotes,
        status: "Completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", input.requestId);

    if (reqErr) throw reqErr;

    return { ok: true, newCapacity };
  } catch (err: unknown) {
    console.error("admitHospitalPatientAction error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to admit patient.",
    };
  }
}

export async function updateHospitalCapacityAction(
  hospitalId: string,
  capacity: number,
): Promise<{ ok: boolean; error?: string }> {
  await requireProfile(["hospital", "admin", "dispatcher"]);

  const admin = createServiceClient(getSupabaseUrl(), serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin
    .from("hospitals")
    .update({ available_capacity: capacity })
    .eq("id", hospitalId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}