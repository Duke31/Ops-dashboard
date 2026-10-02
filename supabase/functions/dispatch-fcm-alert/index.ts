// Supabase Edge Function: dispatch-fcm-alert
// Handles FCM v1 HTTP API Push Notifications for Emergency Dispatch
// High-priority data + alert payload to wake sleeping Android devices and play sirens

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY") || Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const record = payload.record || payload;

    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: "Invalid emergency record payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Determine target driver and fetch their FCM token
    const driverId = record.driver_id;
    if (!driverId) {
      return new Response(JSON.stringify({ message: "No driver assigned to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, fcm_token, active, duty_status")
      .eq("id", driverId)
      .maybeSingle();

    if (driverErr || !driver) {
      return new Response(JSON.stringify({ error: "Driver not found: " + driverErr?.message }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fcmToken = driver.fcm_token;
    if (!fcmToken) {
      console.log(`[FCM Warning] Driver ${driver.display_name} has no registered FCM token yet.`);
      return new Response(JSON.stringify({ message: "Driver has no registered FCM token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Build High-Priority Alert Payload for Emergency Dispatch
    const emergencyType = record.emergency_type || "Medical Emergency";
    const patientAddress = record.patient_address || "Caller Location";
    const emergencyId = record.id;
    const status = record.status || "Driver assigned";

    const title = `🚨 EMERGENCY DISPATCH: ${emergencyType.toUpperCase()}`;
    const body = `Respond immediately to ${patientAddress}. Status: ${status}.`;

    const fcmPayload = {
      to: fcmToken,
      priority: "high",
      content_available: true,
      notification: {
        title: title,
        body: body,
        sound: "emergency_siren",
        android_channel_id: "emergency_dispatch",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        id: emergencyId,
        type: "emergency_dispatch",
        emergency_type: emergencyType,
        patient_address: patientAddress,
        patient_lat: String(record.patient_lat || ""),
        patient_lng: String(record.patient_lng || ""),
        contact_phone: String(record.contact_phone || ""),
        status: status,
        full_screen_intent: "true",
        priority: "high",
      },
      android: {
        priority: "high",
        notification: {
          channel_id: "emergency_dispatch",
          sound: "emergency_siren",
          priority: "max",
          visibility: "public",
          default_sound: false,
          default_vibrate_timings: false,
          notification_priority: "PRIORITY_MAX",
        },
      },
    };

    let fcmSuccess = false;
    let responseData = null;

    if (fcmServerKey) {
      // Send via FCM legacy/v1 endpoint
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify(fcmPayload),
      });
      responseData = await res.json();
      fcmSuccess = res.ok;
      console.log("[FCM Push Result]:", responseData);
    } else {
      console.log(`[DRY RUN FCM ALERT] Device: ${fcmToken.substring(0, 10)}... Title: ${title}`);
      fcmSuccess = true;
      responseData = { success: true, dry_run: true };
    }

    return new Response(JSON.stringify({ success: fcmSuccess, details: responseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[FCM Edge Function Error]:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
