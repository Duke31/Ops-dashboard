export function rpcMessage(e: unknown): string {
  if (!e || typeof e !== "object") return "Request failed.";
  const rec = e as { message?: string; details?: string; hint?: string };
  return [rec.message, rec.details, rec.hint].filter(Boolean).join(" — ");
}
