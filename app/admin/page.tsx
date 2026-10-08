import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { LogEmergencyForm } from "@/components/LogEmergencyForm";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminQueuePage() {
  const { supabase, profile } = await requireProfile("admin");
  const [requests, dispatcherRules, hospitalRules, adminRules, hospitalsRes, driversRes] =
    await Promise.all([
      fetchRequests(supabase, { activeOnly: true }),
      fetchTransitionRules(supabase, "dispatcher"),
      fetchTransitionRules(supabase, "hospital"),
      fetchTransitionRules(supabase, "admin"),
      supabase
        .from("hospitals")
        .select("id, name, available_capacity")
        .order("name")
        .then(
          (res) => res,
          () => ({ data: [] as { id: string; name: string; available_capacity: number | null }[], error: null, count: null, status: 200, statusText: "OK" }),
        ),
      supabase
        .from("drivers")
        .select("id, display_name, vehicle_label, hospital_id, active")
        .order("display_name")
        .then(
          (res) => res,
          () => ({ data: [] as { id: string; display_name: string; vehicle_label: string | null; hospital_id: string | null; active: boolean }[], error: null, count: null, status: 200, statusText: "OK" }),
        ),
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
        drivers={driversRes.data ?? []}
      />
    </AppShell>
  );
}
