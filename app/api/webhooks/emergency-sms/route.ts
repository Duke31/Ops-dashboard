import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dispatchEmergencySms } from "@/lib/sms";

/**
 * POST /api/webhooks/emergency-sms
 *
 * Supabase Database Webhook → outbound SMS notifications to:
 *   - Patient caller (status change: driver assigned / picked up / arrived)
 *   - Receiving hospital ER desk (en route / patient on board)
 *
 * Security fixes:
 *   MEDIUM-2: SUPABASE_WEBHOOK_SECRET is now MANDATORY (not optional).
 *             Missing env var → 500 (not silently open).
 *   The service_role client is used exclusively server-side in this route.
 */

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    status: string;
    driver_id?: string | null;
    hospital_id?: string | null;
    contact_phone?: string | null;
    emergency_type?: string | null;
    patient_address?: string | null;
    priority?: number | null;
    patient_age_band?: string | null;
  };
  old_record?: {
    status?: string | null;
    driver_id?: string | null;
    hospital_id?: string | null;
  } | null;
}

export async function POST(req: NextRequest) {
  try {
    // ── SECURITY: webhook secret is MANDATORY — fail hard if not configured ───
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(
        "[emergency-sms] SUPABASE_WEBHOOK_SECRET is not set. " +
        "This endpoint is LOCKED until the secret is configured in Vercel env vars."
      );
      return NextResponse.json(
        { error: "Webhook endpoint is not configured (missing secret)" },
        { status: 500 }
      );
    }

    const headerSecret = req.headers.get("x-webhook-secret");
    if (!headerSecret || headerSecret !== webhookSecret) {
      return NextResponse.json(
        { error: "Unauthorized webhook request" },
        { status: 401 }
      );
    }

    const payload = (await req.json()) as WebhookPayload;

    if (!payload || !payload.record) {
      return NextResponse.json(
        { error: "Invalid webhook payload structure" },
        { status: 400 }
      );
    }

    const record = payload.record;
    const oldRecord = payload.old_record;
    const currentStatus = record.status;
    const oldStatus = oldRecord?.status;

    const isNewAssignment = record.driver_id && record.driver_id !== oldRecord?.driver_id;
    const isStatusChanged = currentStatus !== oldStatus;

    if (!isNewAssignment && !isStatusChanged && payload.type !== "INSERT") {
      return NextResponse.json({ message: "No dispatch action required for this event." });
    }

    const supabase = getAdminSupabase();
    const smsDispatches: Array<{
      phone: string;
      role: "caller" | "hospital" | "driver";
      message: string;
    }> = [];

    // Fetch Driver metadata if assigned
    let driverName = "Assigned Responder";
    let driverPhone: string | null = null;
    let vehicleLabel = "Rapid Response Unit";

    if (record.driver_id) {
      const { data: driverData } = await supabase
        .from("drivers")
        .select("display_name, full_name, phone, phone_number, vehicle_label, vehicle_plate")
        .eq("id", record.driver_id)
        .maybeSingle();

      if (driverData) {
        driverName = driverData.display_name || driverData.full_name || driverName;
        driverPhone = driverData.phone || driverData.phone_number || null;
        vehicleLabel = driverData.vehicle_label || driverData.vehicle_plate || vehicleLabel;
      }
    }

    // Fetch Hospital metadata if assigned
    let hospitalName: string | null = null;
    let hospitalIntakePhone: string | null = null;

    if (record.hospital_id) {
      const { data: hospitalData } = await supabase
        .from("hospitals")
        .select("name, hospital_name, intake_phone, phone, emergency_contact")
        .eq("id", record.hospital_id)
        .maybeSingle();

      if (hospitalData) {
        hospitalName = hospitalData.name || hospitalData.hospital_name || null;
        hospitalIntakePhone =
          hospitalData.intake_phone ||
          hospitalData.phone ||
          hospitalData.emergency_contact ||
          null;
      }
    }

    // SMS to caller
    if (record.contact_phone) {
      const shortId = record.id.substring(0, 6).toUpperCase();

      if (
        (isNewAssignment || isStatusChanged) &&
        (currentStatus === "Driver assigned" || currentStatus === "En route to patient")
      ) {
        const driverContactText = driverPhone ? ` Driver phone: ${driverPhone}.` : "";
        const smsBody = `[EMERGENCY AID #${shortId}] Ambulance assigned. Responder: ${driverName} (${vehicleLabel}).${driverContactText} Unit is en route to your coordinates. Stay on the line.`;
        smsDispatches.push({ phone: record.contact_phone, role: "caller", message: smsBody });
      } else if (currentStatus === "Patient picked up") {
        const hospText = hospitalName ? ` Heading to ${hospitalName}.` : "";
        const smsBody = `[EMERGENCY AID #${shortId}] Patient is on board.${hospText} Emergency medical care is active in transit.`;
        smsDispatches.push({ phone: record.contact_phone, role: "caller", message: smsBody });
      } else if (currentStatus === "Arrived / intake") {
        const hospText = hospitalName ? ` at ${hospitalName}` : "";
        const smsBody = `[EMERGENCY AID #${shortId}] Patient has arrived${hospText} and is undergoing triage intake.`;
        smsDispatches.push({ phone: record.contact_phone, role: "caller", message: smsBody });
      }
    }

    // SMS to receiving hospital ER desk
    if (
      hospitalIntakePhone &&
      (currentStatus === "En route to hospital" || currentStatus === "Patient picked up")
    ) {
      const condition = record.emergency_type || "Acute Emergency";
      const priorityLabel = record.priority ? `Priority ${record.priority}` : "Emergency";
      const smsBody = `[ER INTAKE ALERT] Incoming ambulance ${vehicleLabel}. Case: ${condition} (${priorityLabel}). Patient on board, en route to your ER bay.`;
      smsDispatches.push({ phone: hospitalIntakePhone, role: "hospital", message: smsBody });
    }

    // Dispatch SMS and log to immutable database log
    const results = [];
    for (const item of smsDispatches) {
      const sendRes = await dispatchEmergencySms({
        to: item.phone,
        message: item.message,
      });

      try {
        await supabase.from("sms_notifications_log").insert({
          request_id: record.id,
          recipient_phone: item.phone,
          recipient_role: item.role,
          message_body: item.message,
          provider: sendRes.provider,
          status: sendRes.success ? "sent" : "failed",
          provider_message_id: sendRes.messageId || null,
          error_details: sendRes.error || null,
        });
      } catch (logErr) {
        console.warn("Failed to write to sms_notifications_log:", logErr);
      }

      results.push({
        recipient: item.phone,
        role: item.role,
        ...sendRes,
      });
    }

    return NextResponse.json({
      success: true,
      processed: smsDispatches.length,
      dispatches: results,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("SMS Webhook error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
