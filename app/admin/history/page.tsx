import { AppShell } from "@/components/AppShell";
import { AdminHistoryView } from "@/components/AdminHistoryView";
import { requireProfile } from "@/lib/auth";
import { fetchRequests } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHistoryPage() {
  const { supabase, profile } = await requireProfile("admin");

  // Fetch all lifetime emergency requests (activeOnly: false fetches completed, cancelled, and active)
  const requests = await fetchRequests(supabase, { activeOnly: false });

  return (
    <AppShell profile={profile}>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[var(--foreground)]">
          Emergency Requests History & Audit Log
        </h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Comprehensive historical archive of all emergency dispatches, completed admissions, cancelled tickets, and patient ratings.
        </p>
      </div>

      <AdminHistoryView requests={requests} />
    </AppShell>
  );
}
