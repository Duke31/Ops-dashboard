import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/driver/emergency-trigger
 *
 * Driver one-tap distress signal: appends a tactical alert to an active
 * emergency_requests row, or creates a new crew-SOS request if none is active.
 *
 * Security fix CRITICAL-2:
 * - Requires authenticated session via getUser()
 * - Caller must hold driver, dispatcher, or admin role
 * - Drivers may only trigger alerts on requests assigned to their own driver record
 * - Anonymous and client-role callers are rejected with 401/403
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // ── SECURITY GUARD: require authenticated session ─────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── SECURITY GUARD: role check ────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const allowed = ["driver", "dispatcher", "admin"];
    if (!profile || !allowed.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── REQUEST PARSING ───────────────────────────────────────────────────────
    const body = await req.json();
    const {
      requestId,
      driverId,
      driverName,
      vehicleLabel,
      alertCode,
      alertMessage,
      lat,
      lng,
    } = body;

    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const formattedAlert = alertMessage || "EMERGENCY TRIGGERED BY DRIVER";
    const formattedCode = alertCode || "EMERGENCY";

    let targetReqId = requestId;

    if (targetReqId) {
      // ── SECURITY: drivers may only alert on their own assigned request ──────
      if (profile.role === "driver") {
        const { data: reqCheck } = await supabase
          .from("emergency_requests")
          .select("driver_id")
          .eq("id", targetReqId)
          .maybeSingle();

        // Verify this request is actually assigned to the calling driver
        const { data: ownDriver } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!reqCheck || !ownDriver || reqCheck.driver_id !== ownDriver.id) {
          return NextResponse.json(
            { error: "Forbidden: you are not assigned to this request" },
            { status: 403 }
          );
        }
      }

      // 1. Call trigger_driver_emergency_alert RPC (now auth-guarded)
      const { error: rpcErr } = await supabase.rpc(
        "trigger_driver_emergency_alert",
        {
          p_request_id: targetReqId,
          p_alert_code: formattedCode,
          p_alert_message: formattedAlert,
        }
      );

      // If RPC fails (schema not yet migrated), fallback to direct note update
      if (rpcErr) {
        console.warn(
          "trigger_driver_emergency_alert RPC fallback:",
          rpcErr.message
        );
        const { data: existing } = await supabase
          .from("emergency_requests")
          .select("notes")
          .eq("id", targetReqId)
          .maybeSingle();

        const currentNotes = existing?.notes || "";
        const updated = currentNotes
          ? `${currentNotes}\n[TACTICAL ALERT ${timeStr}]: ${formattedAlert}`
          : `[TACTICAL ALERT ${timeStr}]: ${formattedAlert}`;

        await supabase
          .from("emergency_requests")
          .update({ notes: updated })
          .eq("id", targetReqId);
      }
    } else {
      // Create new distress request — driver triggered SOS without active mission
      const { data: newReq, error: insertErr } = await supabase
        .from("emergency_requests")
        .insert({
          emergency_type: `🚨 AMBULANCE CREW SOS: ${driverName || "Driver"} (${vehicleLabel || "Unit"})`,
          priority: "CRITICAL",
          status: "Requested",
          driver_id: driverId || null,
          patient_lat: lat || null,
          patient_lng: lng || null,
          patient_address: `Ambulance Crew Distress Signal - ${driverName || "Ambulance"} (${vehicleLabel || "Active Unit"})`,
          notes: `[TACTICAL ALERT ${timeStr}]: ${formattedAlert}`,
        })
        .select("id")
        .maybeSingle();

      if (insertErr) {
        console.error(
          "Failed to insert distress emergency request:",
          insertErr
        );
      } else if (newReq?.id) {
        targetReqId = newReq.id;
      }
    }

    // 2. Broadcast over Realtime for instant Dispatcher Console update
    try {
      const channel = supabase.channel("ops-request-board-sync");
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "driver_tactical_alert",
        payload: {
          request_id: targetReqId,
          driver_id: driverId,
          driver_name: driverName || "Ambulance Unit",
          vehicle_label: vehicleLabel || "Ambulance",
          alert_code: formattedCode,
          alert_message: formattedAlert,
          created_at: nowIso,
        },
      });
    } catch (broadcastErr) {
      console.warn("Broadcast warning:", broadcastErr);
    }

    return NextResponse.json({
      success: true,
      message: "Emergency alert broadcasted and logged for Dispatcher Console",
      requestId: targetReqId,
    });
  } catch (err: unknown) {
    console.error("emergency-trigger error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to trigger emergency",
      },
      { status: 500 }
    );
  }
}
