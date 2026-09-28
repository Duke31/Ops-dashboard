import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { toNigeriaE164 } from "@/lib/sms/e164";
import { sendSms, resolveSmsProvider } from "@/lib/sms/provider";
import { callerDispatchSms, hospitalIntakeSms } from "@/lib/sms/templates";
import { getSupabaseUrl } from "@/lib/env";

export const runtime = "nodejs";

type WebhookBody = {
  type?: string;
  table?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown> | null;
  // Allow direct test posts
  request_id?: string;
  status?: string;
};

const CALLER_STATUSES = new Set([
  "Driver assigned",
  "En route to patient",
]);

const HOSPITAL_STATUSES = new Set(["En route to hospital"]);

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return key;
}

function webhookSecret() {
  return process.env.EMERGENCY_SMS_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || "";
}

function adminClient() {
  return createServiceClient(getSupabaseUrl(), serviceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function logSms(
  admin: ReturnType<typeof adminClient>,
  row: {
    request_id: string | null;
    recipient_e164: string;
    recipient_role: "caller" | "hospital" | "driver" | "other";
    trigger_status: string;
    template_key: string;
    body_preview: string;
    provider: string;
    provider_message_id: string | null;
    http_status: number | null;
    success: boolean;
    error_message: string | null;
    meta?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("sms_notifications_log").insert({
    request_id: row.request_id,
    recipient_e164: row.recipient_e164,
    recipient_role: row.recipient_role,
    trigger_status: row.trigger_status,
    template_key: row.template_key,
    body_preview: row.body_preview.slice(0, 280),
    provider: row.provider,
    provider_message_id: row.provider_message_id,
    http_status: row.http_status,
    success: row.success,
    error_message: row.error_message,
    meta: row.meta ?? {},
  });
  if (error) {
    console.error("sms_notifications_log insert failed", error);
  }
}

export async function POST(req: NextRequest) {
  const expected = webhookSecret();
  if (!expected) {
    return NextResponse.json(
      { error: "EMERGENCY_SMS_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const headerSecret =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("X-Webhook-Secret") ||
    "";
  if (headerSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const record = body.record ?? {};
  const old = body.old_record ?? null;
  const requestId = String(
    body.request_id || record.id || "",
  );
  const status = String(body.status || record.status || "");
  const oldStatus = old ? String(old.status || "") : "";

  if (!requestId || !status) {
    return NextResponse.json(
      { error: "request id and status required", received: body },
      { status: 400 },
    );
  }

  // Idempotent-ish: only act on transition into a trigger status
  if (oldStatus && oldStatus === status) {
    return NextResponse.json({ ok: true, skipped: "status unchanged" });
  }

  const needsCaller = CALLER_STATUSES.has(status);
  const needsHospital = HOSPITAL_STATUSES.has(status);
  if (!needsCaller && !needsHospital) {
    return NextResponse.json({ ok: true, skipped: "status not in SMS map" });
  }

  let providerName: string;
  try {
    providerName = resolveSmsProvider();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SMS provider config error" },
      { status: 500 },
    );
  }

  const admin = adminClient();

  const { data: reqRow, error: reqErr } = await admin
    .from("emergency_requests")
    .select(
      "id, status, contact_phone, emergency_type, priority, patient_age_band, patient_address, hospital_id, driver_id",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (reqErr) {
    return NextResponse.json(
      { error: "RLS or query error loading request", detail: reqErr.message },
      { status: 500 },
    );
  }
  if (!reqRow) {
    return NextResponse.json({ error: "request not found" }, { status: 404 });
  }

  let driver: {
    display_name: string | null;
    vehicle_label: string | null;
    phone: string | null;
  } | null = null;

  if (reqRow.driver_id) {
    const { data: d, error: dErr } = await admin
      .from("drivers")
      .select("display_name, vehicle_label, phone")
      .eq("id", reqRow.driver_id)
      .maybeSingle();
    if (dErr) {
      return NextResponse.json(
        { error: "error loading driver", detail: dErr.message },
        { status: 500 },
      );
    }
    driver = d;
  }

  let hospital: { name: string | null; intake_phone: string | null } | null =
    null;
  if (reqRow.hospital_id) {
    const { data: h, error: hErr } = await admin
      .from("hospitals")
      .select("name, intake_phone")
      .eq("id", reqRow.hospital_id)
      .maybeSingle();
    if (hErr) {
      return NextResponse.json(
        { error: "error loading hospital", detail: hErr.message },
        { status: 500 },
      );
    }
    hospital = h;
  }

  const results: Record<string, unknown>[] = [];

  if (needsCaller) {
    const e164 = toNigeriaE164(reqRow.contact_phone as string | null);
    if (!e164) {
      results.push({ role: "caller", skipped: "invalid or missing contact_phone" });
    } else {
      const text = callerDispatchSms({
        driverName: driver?.display_name || "Assigned unit",
        driverPhone: driver?.phone || null,
        vehicleLabel: driver?.vehicle_label || null,
        status,
      });
      const sent = await sendSms({ toE164: e164, body: text });
      await logSms(admin, {
        request_id: requestId,
        recipient_e164: e164,
        recipient_role: "caller",
        trigger_status: status,
        template_key: "caller_dispatch",
        body_preview: text,
        provider: sent.provider,
        provider_message_id: sent.messageId,
        http_status: sent.httpStatus,
        success: sent.ok,
        error_message: sent.error,
        meta: { provider: sent.provider, raw: sent.raw },
      });
      results.push({ role: "caller", ...sent });
    }
  }

  if (needsHospital) {
    const e164 = toNigeriaE164(hospital?.intake_phone || null);
    if (!e164) {
      results.push({
        role: "hospital",
        skipped: "invalid or missing hospitals.intake_phone",
      });
    } else {
      const text = hospitalIntakeSms({
        emergencyType: reqRow.emergency_type as string | null,
        priority: reqRow.priority as number | null,
        driverName: driver?.display_name || null,
        vehicleLabel: driver?.vehicle_label || null,
        patientAgeBand: reqRow.patient_age_band as string | null,
        address: reqRow.patient_address as string | null,
      });
      const sent = await sendSms({ toE164: e164, body: text });
      await logSms(admin, {
        request_id: requestId,
        recipient_e164: e164,
        recipient_role: "hospital",
        trigger_status: status,
        template_key: "hospital_intake",
        body_preview: text,
        provider: sent.provider,
        provider_message_id: sent.messageId,
        http_status: sent.httpStatus,
        success: sent.ok,
        error_message: sent.error,
        meta: { provider: sent.provider, raw: sent.raw },
      });
      results.push({ role: "hospital", ...sent });
    }
  }

  return NextResponse.json({ ok: true, provider: providerName, request_id: requestId, status, results });
}

export async function GET() {
  let provider: string | null = null;
  try {
    provider = resolveSmsProvider();
  } catch {
    provider = null;
  }
  return NextResponse.json({
    service: "emergency-sms-webhook",
    provider,
    triggers: {
      caller: [...CALLER_STATUSES],
      hospital: [...HOSPITAL_STATUSES],
    },
  });
}
