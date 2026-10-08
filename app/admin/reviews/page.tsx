import { AppShell } from "@/components/AppShell";
import { PatientReviewsView } from "@/components/PatientReviewsView";
import { requireProfile } from "@/lib/auth";
import { fetchRequests } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminReviewsPage() {
  const { supabase, profile } = await requireProfile("admin");

  // Fetch all requests including completed cases with patient feedback
  const requests = await fetchRequests(supabase, { activeOnly: false });

  return (
    <AppShell profile={profile}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <span>⭐</span>
              <span>Patient Quality of Service & Remarks Audit</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              Admin QA Pathway
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Real-time feedback, ratings, and experience remarks submitted directly by patients via the Solace mobile app.
          </p>
        </div>
      </div>

      <PatientReviewsView requests={requests} role="admin" />
    </AppShell>
  );
}
