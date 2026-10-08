import { AppShell } from "@/components/AppShell";
import { PatientReviewsView } from "@/components/PatientReviewsView";
import { requireProfile } from "@/lib/auth";
import { fetchRequests } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DispatcherReviewsPage() {
  const { supabase, profile } = await requireProfile("dispatcher");

  // Fetch all requests including completed cases with patient feedback
  const requests = await fetchRequests(supabase, { activeOnly: false });

  return (
    <AppShell profile={profile}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
              <span>⭐</span>
              <span>Patient Ratings & Dispatch Experience Remarks</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">
              Dispatcher QA Desk
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Audit patient satisfaction, triage ratings, and remarks submitted by callers post-mission.
          </p>
        </div>
      </div>

      <PatientReviewsView requests={requests} role="dispatcher" />
    </AppShell>
  );
}
