import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { LogEmergencyForm } from "@/components/LogEmergencyForm";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";

export default async function AdminQueuePage() {
  const { supabase, profile } = await requireProfile("admin");
  const [requests, dispatcherRules, hospitalRules, adminRules, hospitalsRes] =
    await Promise.all([
      fetchRequests(supabase, { activeOnly: true }),
      fetchTransitionRules(supabase, "dispatcher"),
      fetchTransitionRules(supabase, "hospital"),
      fetchTransitionRules(supabase, "admin"),
      supabase.from("hospitals").select("id, name").order("name"),
    ]);

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Network queue</h1>
        <p className="text-sm text-[var(--muted)]">
          Combined live view. Transitions are sent as actor_role=admin (must
          match your profile). Buttons follow dispatcher rules.
        </p>
      </div>
      <LogEmergencyForm />
      <RequestBoard
        requests={requests}
        rules={[...adminRules, ...dispatcherRules, ...hospitalRules]}
        actorRole="admin"
        hospitals={hospitalsRes.data ?? []}
      />
    </AppShell>
  );
}
