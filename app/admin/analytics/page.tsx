import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";

function avgMinutes(rows: { created_at: string; completed_at: string | null }[]) {
  const usable = rows.filter((r) => r.completed_at);
  if (!usable.length) return null;
  const total = usable.reduce((acc, r) => {
    return (
      acc +
      (new Date(r.completed_at as string).getTime() -
        new Date(r.created_at).getTime())
    );
  }, 0);
  return total / usable.length / 60000;
}

export default async function AnalyticsPage() {
  const { supabase, profile } = await requireProfile("admin");

  const { data: all, error } = await supabase
    .from("emergency_requests")
    .select("id, status, created_at, completed_at");

  const counts = new Map<string, number>();
  for (const row of all ?? []) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const completed = (all ?? []).filter(
    (r) =>
      r.status === "Completed" &&
      new Date(r.created_at) >= cutoff,
  );

  const avg = avgMinutes(
    completed.map((r) => ({
      created_at: r.created_at,
      completed_at: r.completed_at ?? null,
    })),
  );

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Analytics</h1>
        <p className="text-sm text-[var(--muted)]">
          Counts by status, plus average Requested → Completed time over the
          last 30 days.
        </p>
        {error && (
          <p className="text-sm text-[#b42318] mt-2">{error.message}</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)] font-semibold">
            Requests by status
          </div>
          <ul className="mt-3 space-y-2">
            {[...counts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([status, n]) => (
                <li
                  key={status}
                  className="flex items-center justify-between text-sm"
                >
                  <StatusBadge status={status} />
                  <span className="font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            {!counts.size && (
              <li className="text-sm text-[var(--muted)]">No data yet.</li>
            )}
          </ul>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)] font-semibold">
            Avg. time to complete (30d)
          </div>
          <div className="mt-3 text-3xl font-semibold tabular-nums">
            {avg == null ? "—" : `${avg.toFixed(0)} min`}
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">
            {completed.length} completed request
            {completed.length === 1 ? "" : "s"} in the window. Uses{" "}
            <code className="text-xs">completed_at</code> when present,
            otherwise this metric is blank until that column exists.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
