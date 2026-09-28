import { termiiMsisdn } from "./e164";

export type TermiiSendResult = {
  ok: boolean;
  messageId: string | null;
  httpStatus: number;
  error: string | null;
  raw: unknown;
};

export async function sendTermiiSms(opts: {
  toE164: string;
  body: string;
  apiKey: string;
  senderId: string;
  channel?: "generic" | "dnd" | "whatsapp";
}): Promise<TermiiSendResult> {
  const to = termiiMsisdn(opts.toE164);
  const url = "https://api.ng.termii.com/api/sms/send";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      from: opts.senderId,
      sms: opts.body,
      type: "plain",
      channel: opts.channel ?? "generic",
      api_key: opts.apiKey,
    }),
  });

  let raw: unknown = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  const obj = raw as Record<string, unknown> | null;
  const messageId =
    (obj?.message_id as string | undefined) ||
    (obj?.messageId as string | undefined) ||
    null;

  if (!res.ok) {
    return {
      ok: false,
      messageId,
      httpStatus: res.status,
      error:
        (obj?.message as string | undefined) ||
        (obj?.error as string | undefined) ||
        `Termii HTTP ${res.status}`,
      raw,
    };
  }

  // Termii sometimes returns 200 with code != ok
  const code = String(obj?.code ?? obj?.status ?? "ok").toLowerCase();
  if (code && code !== "ok" && code !== "200" && code !== "success") {
    return {
      ok: false,
      messageId,
      httpStatus: res.status,
      error: (obj?.message as string) || `Termii code ${code}`,
      raw,
    };
  }

  return {
    ok: true,
    messageId,
    httpStatus: res.status,
    error: null,
    raw,
  };
}
