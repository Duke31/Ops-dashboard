import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/driver/dispatch-notify
 *
 * Sends a real-time dispatch notification to an assigned driver.
 *
 * Security fix CRITICAL-2:
 * - Requires authenticated session via getUser()
 * - Caller must hold driver, dispatcher, or admin role
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
    const { driverId, requestId, patientAddress, emergencyType, priority } = body;

    if (!driverId || !requestId) {
      return NextResponse.json(
        { error: "Missing driverId or requestId" },
        { status: 400 }
      );
    }

    // 1. Fetch driver details (display name / vehicle label for notification body)
    const { data: driver } = await supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, contact_phone, fcm_token")
      .eq("id", driverId)
      .maybeSingle();

    // 2. Broadcast via Supabase Realtime channel
    const channel = supabase.channel(`driver_dispatch_realtime_${driverId}`);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "emergency_assigned",
      payload: {
        request_id: requestId,
        patient_address: patientAddress || "Emergency Location",
        emergency_type: emergencyType || "Emergency Run",
        priority: priority || "URGENT",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Driver dispatch notification dispatched successfully",
      driver: driver
        ? { name: driver.display_name, unit: driver.vehicle_label }
        : null,
    });
  } catch (err: unknown) {
    console.error("dispatch-notify error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to dispatch notification",
      },
      { status: 500 }
    );
  }
}
