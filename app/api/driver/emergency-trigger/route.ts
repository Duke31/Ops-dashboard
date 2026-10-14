import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
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

    const supabase = await createClient();

    let targetReqId = requestId;
    const nowIso = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const formattedAlert = alertMessage || "EMERGENCY TRIGGERED BY DRIVER";
    const formattedCode = alertCode || "EMERGENCY";

    if (targetReqId) {
      // 1. Call trigger_driver_emergency_alert RPC
      const { error: rpcErr } = await supabase.rpc("trigger_driver_emergency_alert", {
        p_request_id: targetReqId,
        p_alert_code: formattedCode,
        p_alert_message: formattedAlert,
      });

      // If RPC fails (e.g. not migrated yet), fallback to direct note update
      if (rpcErr) {
        console.warn("trigger_driver_emergency_alert RPC fallback:", rpcErr.message);
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
      // Create new distress request if driver triggered SOS without an active assigned mission
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
        console.error("Failed to insert distress emergency request:", insertErr);
      } else if (newReq?.id) {
        targetReqId = newReq.id;
      }
    }

    // 2. Broadcast immediately over Supabase Realtime channel ops-request-board-sync
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
      { error: err instanceof Error ? err.message : "Failed to trigger emergency" },
      { status: 500 }
    );
  }
}
