// Supabase Edge Function: dispatch-sms
// Follows Deno runtime standards for Supabase Edge Functions

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const termiiApiKey = Deno.env.get("TERMII_API_KEY");
    const termiiSenderId = Deno.env.get("TERMII_SENDER_ID") || "Emergency";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const record = payload.record;

    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: "Invalid record payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only process if status or driver changed
    const status = record.status;
    const phone = record.contact_phone;

    if (phone && (status === "Driver assigned" || status === "En route to patient")) {
      // Format number to 234...
      let normalized = phone.trim().replace(/[^\d+]/g, "");
      if (normalized.startsWith("+")) normalized = normalized.substring(1);
      if (normalized.startsWith("0") && normalized.length === 11) {
        normalized = "234" + normalized.substring(1);
      }

      const shortId = record.id.substring(0, 6).toUpperCase();
      const message = `[EMERGENCY AID #${shortId}] Ambulance unit dispatched and en route to your coordinates. Stay on the line. Help is on the way.`;

      let smsSuccess = false;
      let errorDetails = null;

      if (termiiApiKey) {
        const res = await fetch("https://api.ng.termii.com/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: normalized,
            from: termiiSenderId,
            sms: message,
            type: "plain",
            channel: "generic",
            api_key: termiiApiKey,
          }),
        });
        const termiiData = await res.json();
        smsSuccess = res.ok;
        if (!smsSuccess) errorDetails = JSON.stringify(termiiData);
      } else {
        console.log(`[DRY RUN SMS] To: ${normalized}, Msg: ${message}`);
        smsSuccess = true;
      }

      // Log into sms_notifications_log
      await supabase.from("sms_notifications_log").insert({
        request_id: record.id,
        recipient_phone: normalized,
        recipient_role: "caller",
        message_body: message,
        provider: termiiApiKey ? "termii" : "dry_run",
        status: smsSuccess ? "sent" : "failed",
        error_details: errorDetails,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
