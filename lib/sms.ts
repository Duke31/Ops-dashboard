/**
 * SMS Gateway Client for Emergency Telecommunications
 * Supports Termii (Primary for Nigeria) and Africa's Talking with E.164 normalization.
 */

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: "termii" | "africas_talking" | "dry_run";
  error?: string;
}

/**
 * Normalizes any Nigerian telephone string (e.g. "08123456789", "+234 812 345 6789")
 * into the strict telecom format (e.g. "2348123456789").
 */
export function normalizeNigerianPhone(rawPhone: string): string | null {
  if (!rawPhone) return null;
  
  // Remove all non-digit characters except leading plus
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  // Handle local formats: 080..., 070..., 090..., 081...
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "234" + cleaned.substring(1);
  } else if (cleaned.length === 10 && !cleaned.startsWith("234")) {
    cleaned = "234" + cleaned;
  }

  // Valid Nigerian number in international format must be 13 digits starting with 234
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
    console.warn("[SMS Gateway] TERMII_API_KEY is not configured. Running in DRY RUN mode.");
    return {
      success: true,
      provider: "dry_run",
      messageId: `dry_run_${Date.now()}`,
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: normalized,
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic", // high-delivery route for transactional / alert SMS
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
 * Works out-of-the-box in free Sandbox mode (no CAC/documents required).
 */
export async function sendAfricasTalkingSms(to: string, message: string): Promise<SmsSendResult> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME || "sandbox";
  const senderId = process.env.AFRICASTALKING_SENDER_ID; // optional

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

  // Africa's Talking expects international format with leading '+'
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
      // Status can be 'Success' or 'Pending'
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
 * Automatically routes to Africa's Talking, Termii, or Dry Run fallback.
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

  // 1. If Africa's Talking credentials exist, use Africa's Talking
  if (process.env.AFRICASTALKING_API_KEY) {
    return await sendAfricasTalkingSms(normalized, message);
  }

  // 2. If Termii credentials exist, use Termii
  if (process.env.TERMII_API_KEY) {
    return await sendTermiiSms(normalized, message);
  }

  // 3. Dry Run fallback when neither is configured
  console.log(`[SMS Dry-Run] to: ${normalized} | message: ${message}`);
  return {
    success: true,
    provider: "dry_run",
    messageId: `simulated_${Date.now()}`,
  };
}
