/**
 * lib/sms.ts
 * SMS Gateway Client for Emergency Telecommunications
 * Supports Termii (primary for Nigeria) and Africa's Talking with E.164 normalization.
 *
 * Security fix LOW-2:
 * Dry-run mode now returns success: false so missing provider config surfaces
 * as a failed delivery in sms_notifications_log rather than a silent drop.
 */

export interface SmsSendResult {
  success: boolean;
  messageId?: string | null;
  provider: "termii" | "africas_talking" | "dry_run";
  error?: string;
}

/**
 * Normalizes any Nigerian telephone string (e.g. "08123456789", "+234 812 345 6789")
 * into the strict E.164 format required by Termii / Africa's Talking.
 */
export function normalizeNigerianPhone(rawPhone: string): string | null {
  if (!rawPhone) return null;

  let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Handle local formats: 080..., 070..., 090..., 081... (11 digits, leading 0)
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.substring(1);
  } else if (cleaned.length === 10 && !cleaned.startsWith("234")) {
    cleaned = "234" + cleaned;
  }

  // Valid Nigerian number in international format: 13 digits starting with 234
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return cleaned;
  }

  return cleaned.length >= 10 ? cleaned : null;
}

/**
 * Dispatches an emergency SMS via Termii API
 */
export async function sendTermiiSms(to: string, message: string): Promise<SmsSendResult> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || "Emergency";

  if (!apiKey) {
    console.warn("[SMS Gateway] TERMII_API_KEY is not configured. SMS not delivered.");
    return {
      success: false,        // Fix LOW-2: was true in dry_run — now correctly false
      provider: "dry_run",
      messageId: null,
      error: "TERMII_API_KEY not configured — message was NOT delivered",
    };
  }

  const normalized = normalizeNigerianPhone(to);
  if (!normalized) {
    return {
      success: false,
      provider: "termii",
      error: `Invalid destination telephone format: ${to}`,
    };
  }

  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: normalized,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    const data = await res.json();
    if (res.ok && (data.code === "ok" || data.message_id || data.message === "Successfully Sent")) {
      return {
        success: true,
        provider: "termii",
        messageId: data.message_id || data.messageId,
      };
    }

    return {
      success: false,
      provider: "termii",
      error: data.message || JSON.stringify(data),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      provider: "termii",
      error: `Network error reaching Termii: ${errorMsg}`,
    };
  }
}

/**
 * Dispatches an emergency SMS via Africa's Talking API
 */
export async function sendAfricasTalkingSms(to: string, message: string): Promise<SmsSendResult> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME || "sandbox";
  const senderId = process.env.AFRICASTALKING_SENDER_ID;

  if (!apiKey) {
    return {
      success: false,
      provider: "africas_talking",
      error: "AFRICASTALKING_API_KEY is not configured",
    };
  }

  const normalized = normalizeNigerianPhone(to);
  if (!normalized) {
    return {
      success: false,
      provider: "africas_talking",
      error: `Invalid destination telephone format: ${to}`,
    };
  }

  const formattedPhone = normalized.startsWith("+") ? normalized : `+${normalized}`;
  const isSandbox = username.toLowerCase() === "sandbox";
  const endpoint = isSandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";

  const formBody = new URLSearchParams();
  formBody.append("username", username);
  formBody.append("to", formattedPhone);
  formBody.append("message", message);
  if (senderId && !isSandbox) {
    formBody.append("from", senderId);
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apiKey: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formBody.toString(),
    });

    const data = await res.json();
    const recipients = data?.SMSMessageData?.Recipients;

    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      const recipientStatus = recipients[0];
      const status = recipientStatus.status?.toLowerCase();
      if (status === "success" || status === "pending" || recipientStatus.statusCode === 101) {
        return {
          success: true,
          provider: "africas_talking",
          messageId: recipientStatus.messageId,
        };
      }
      return {
        success: false,
        provider: "africas_talking",
        error: `Delivery rejected: ${recipientStatus.status}`,
      };
    }

    return {
      success: false,
      provider: "africas_talking",
      error: data?.SMSMessageData?.Message || JSON.stringify(data),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      provider: "africas_talking",
      error: `Network error reaching Africa's Talking: ${errorMsg}`,
    };
  }
}

/**
 * Universal Emergency SMS Dispatcher
 * Routes to Africa's Talking → Termii → explicit failure (no silent drop).
 *
 * Security fix LOW-2: Dry-run now returns success: false so the SMS log
 * accurately reflects the delivery failure, alerting ops teams to a missing
 * provider configuration rather than silently hiding it.
 */
export async function dispatchEmergencySms({
  to,
  message,
}: {
  to: string;
  message: string;
  recipientRole?: "caller" | "hospital" | "driver";
}): Promise<SmsSendResult> {
  const normalized = normalizeNigerianPhone(to);
  if (!normalized) {
    return {
      success: false,
      provider: "dry_run",
      error: `Invalid phone number: ${to}`,
    };
  }

  // Route 1: Africa's Talking
  if (process.env.AFRICASTALKING_API_KEY) {
    return await sendAfricasTalkingSms(normalized, message);
  }

  // Route 2: Termii
  if (process.env.TERMII_API_KEY) {
    return await sendTermiiSms(normalized, message);
  }

  // No provider configured — LOG THE FAILURE, do not pretend success
  const errorMessage =
    "No SMS provider configured. Set TERMII_API_KEY or AFRICASTALKING_API_KEY in Vercel env vars. Message was NOT delivered.";
  console.error(`[SMS Dry-Run] to: ${normalized} | ${errorMessage}`);
  return {
    success: false,      // Fix LOW-2: was silently true — now correctly false
    provider: "dry_run",
    messageId: null,
    error: errorMessage,
  };
}
