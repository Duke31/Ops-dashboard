export function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return rem ? `${hours}h ${rem}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("cancel") || s.includes("fail") || s.includes("declin")) {
    return "badge-danger";
  }
  if (s.includes("complete")) return "badge-ok";
  if (s.includes("assign") || s.includes("en route") || s.includes("arriv")) {
    return "badge-info";
  }
  if (s.includes("accept") || s.includes("match")) return "badge-warn";
  return "badge-neutral";
}
