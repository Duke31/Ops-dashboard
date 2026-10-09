export function rpcMessage(e: unknown): string {
  if (!e || typeof e !== "object") return "Request failed.";
  const rec = e as { message?: string; details?: string; hint?: string; code?: string };
  const raw = [rec.message, rec.details, rec.hint].filter(Boolean).join(" ");

  // Sanitize Postgres & PostgREST internal messages (Prevent Information Disclosure CWE-209)
  if (
    rec.code === "42501" ||
    /permission denied|row-level security|insufficient_standing/i.test(raw)
  ) {
    return "Access denied: You do not have permission to perform this action.";
  }

  if (/unauthenticated|auth\.uid\(\) is null/i.test(raw)) {
    return "Session expired or unauthenticated. Please sign in again.";
  }

  if (rec.code === "23505" || /unique_violation/i.test(raw)) {
    return "This record has already been submitted or updated.";
  }

  if (/network|failed to fetch|timeout|socket/i.test(raw)) {
    return "Network connectivity issue. Please check your connection.";
  }

  // If there's a clean user-facing error message without SQL keywords, return it
  if (rec.message && !/table|column|function|schema|syntax error|relation/i.test(rec.message)) {
    return rec.message;
  }

  return "An unexpected error occurred while processing your request.";
}
