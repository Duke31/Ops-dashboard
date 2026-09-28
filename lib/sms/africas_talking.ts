/**
 * Africa's Talking SMS (sandbox + live).
 * Docs: POST https://api.africastalking.com/version1/messaging
 * Sandbox: https://api.sandbox.africastalking.com/version1/messaging
 *
 * Numbers must be E.164 with leading + (e.g. +234803...).
 */

export type AtSendResult = {
  ok: boolean;
  messageId: string | null;
  httpStatus: number;
  error: string | null;
  raw: unknown;
};

function atBaseUrl(live: boolean): string {
  return live
    ? "https://api.africastalking.com/version1/messaging"
    : "https://api.sandbox.africastalking.com/version1/messaging";
}

export async function sendAfricasTalkingSms(opts: {
  toE164: string;
  body: string;
  username: string;
  apiKey: string;
  from?: string | null;
  /** false = sandbox host */
  live?: boolean;
}): Promise<AtSendResult> {
  const to = opts.toE164.startsWith("+")
    ? opts.toE164
    : `+${opts.toE164.replace(/^\+/, "")}`;

  const params = new URLSearchParams();
  params.set("username", opts.username);
  params.set("to", to);
  params.set("message", opts.body);
  if (opts.from) params.set("from", opts.from);

  const res = await fetch(atBaseUrl(opts.live !== false), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey: opts.apiKey,
    },
    body: params.toString(),
  });

  let raw: unknown = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  const obj = raw as {
    SMSMessageData?: {
      Message?: string;
      Recipients?: Array<{
        statusCode?: number;
        number?: string;
        status?: string;
        messageId?: string;
      }>;
    };
  } | null;

  const recipients = obj?.SMSMessageData?.Recipients ?? [];
  const first = recipients[0];
  const messageId = first?.messageId ?? null;
  const statusCode = first?.statusCode;
  // AT: 100/101/102 typically success for accepted
  const recipientOk =
    statusCode === 100 ||
    statusCode === 101 ||
    statusCode === 102 ||
    String(first?.status || "").toLowerCase().includes("success");

  if (!res.ok) {
    return {
      ok: false,
      messageId,
      httpStatus: res.status,
      error:
        obj?.SMSMessageData?.Message ||
        `Africa's Talking HTTP ${res.status}`,
      raw,
    };
  }

  if (recipients.length > 0 && !recipientOk) {
    return {
      ok: false,
      messageId,
      httpStatus: res.status,
      error: first?.status || obj?.SMSMessageData?.Message || "AT send failed",
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
