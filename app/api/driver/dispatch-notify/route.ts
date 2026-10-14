import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driverId, requestId, patientAddress, emergencyType, priority } = body;

    if (!driverId || !requestId) {
      return NextResponse.json({ error: "Missing driverId or requestId" }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch driver details (FCM token / phone)
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
      driver: driver ? { name: driver.display_name, unit: driver.vehicle_label } : null,
    });
  } catch (err: unknown) {
    console.error("dispatch-notify error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to dispatch notification" },
      { status: 500 }
    );
  }
}
