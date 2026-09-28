/**
 * Normalize Nigerian mobile numbers to E.164 (+234…).
 * Accepts: 0803…, 803…, 234803…, +234803…
 */
export function toNigeriaE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "").trim();
  if (!d) return null;

  if (d.startsWith("+")) d = d.slice(1);
  d = d.replace(/\D/g, "");

  // 0803xxxxxxx (11 digits)
  if (d.length === 11 && d.startsWith("0")) {
    d = `234${d.slice(1)}`;
  }
  // 803xxxxxxx (10 digits, no leading 0)
  if (d.length === 10 && /^[789]/.test(d)) {
    d = `234${d}`;
  }
  // already 234…
  if (d.length === 13 && d.startsWith("234")) {
    return `+${d}`;
  }
  if (d.length >= 12 && d.startsWith("234")) {
    return `+${d}`;
  }
  return null;
}

/** Termii often wants digits without + */
export function termiiMsisdn(e164: string): string {
  return e164.replace(/^\+/, "");
}
