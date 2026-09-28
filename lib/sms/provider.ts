import { sendAfricasTalkingSms, type AtSendResult } from "./africas_talking";
import { sendTermiiSms, type TermiiSendResult } from "./termii";

export type SmsProviderName = "termii" | "africas_talking";

export type SmsSendResult = {
  ok: boolean;
  messageId: string | null;
  httpStatus: number;
  error: string | null;
  raw: unknown;
  provider: SmsProviderName;
};

export function resolveSmsProvider(): SmsProviderName {
  const explicit = (process.env.SMS_PROVIDER || "").trim().toLowerCase();
  if (explicit === "termii" || explicit === "africas_talking") {
    return explicit;
  }
  // Auto-detect: prefer AT if its key is set and Termii is not
  if (process.env.AFRICASTALKING_API_KEY && !process.env.TERMII_API_KEY) {
    return "africas_talking";
  }
  if (process.env.TERMII_API_KEY) return "termii";
  if (process.env.AFRICASTALKING_API_KEY) return "africas_talking";
  throw new Error(
    "No SMS provider configured. Set SMS_PROVIDER=termii|africas_talking and the matching API keys.",
  );
}

export async function sendSms(opts: {
  toE164: string;
  body: string;
}): Promise<SmsSendResult> {
  // Always normalize to +E.164 for AT; Termii strips + internally
  const toE164 = opts.toE164.startsWith("+")
    ? opts.toE164
    : `+${opts.toE164.replace(/\D/g, "")}`;

  const provider = resolveSmsProvider();

  if (provider === "africas_talking") {
    const username = process.env.AFRICASTALKING_USERNAME || "";
    const apiKey = process.env.AFRICASTALKING_API_KEY || "";
    if (!username || !apiKey) {
      throw new Error(
        "AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY must be set",
      );
    }
    const live =
      (process.env.AFRICASTALKING_LIVE || "false").toLowerCase() === "true";
    const from = process.env.AFRICASTALKING_FROM || null;
    const r: AtSendResult = await sendAfricasTalkingSms({
      toE164,
      body: opts.body,
      username,
      apiKey,
      from,
      live,
    });
    return { ...r, provider };
  }

  const apiKey = process.env.TERMII_API_KEY || "";
  const senderId = process.env.TERMII_SENDER_ID || "";
  if (!apiKey || !senderId) {
    throw new Error("TERMII_API_KEY and TERMII_SENDER_ID must be set");
  }
  const r: TermiiSendResult = await sendTermiiSms({
    toE164,
    body: opts.body,
    apiKey,
    senderId,
  });
  return { ...r, provider };
}
