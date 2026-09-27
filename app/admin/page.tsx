import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { LogEmergencyForm } from "@/components/LogEmergencyForm";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";
import type { Driver, EmergencyRequest, Hospital, TransitionRule } from "@/lib/types";

export default async function AdminQueuePage() {
  const { supabase, profile } = await requireProfile(["admin", "dispatcher"]);

  const [
    requests,
    dispatcherRules,
    hospitalRules,
    adminRules,
    hospitalsRes,
    driversRes,
  ] = await Promise.all([
    fetchRequests(supabase, { activeOnly: true }).catch(() => [] as EmergencyRequest[]),
    fetchTransitionRules(supabase, "dispatcher").catch(() => [] as TransitionRule[]),
    fetchTransitionRules(supabase, "hospital").catch(() => [] as TransitionRule[]),
    fetchTransitionRules(supabase, "admin").catch(() => [] as TransitionRule[]),
    supabase
      .from("hospitals")
      .select("id, name")
      .order("name")
      .then((res) => res.data ?? [])
      .catch(() => [] as Hospital[]),
    supabase
      .from("drivers")
      .select("id, display_name, vehicle_label, hospital_id, active")
      .eq("active", true)
      .order("display_name")
      .then((res) => res.data ?? [])
      .catch(() => [] as Driver[]),
  ]);

  const allRules = [
    ...(adminRules || []),
    ...(dispatcherRules || []),
    ...(hospitalRules || []),
  ];

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-xl font-bold">Network Queue & Operations</h1>
        <p className="text-xs text-[var(--muted)]">
          Combined network live view. Review emergencies, assign ambulance units, and monitor hospital admissions.
        </p>
      </div>

      <LogEmergencyForm />

      <RequestBoard
        requests={requests || []}
        rules={allRules}
        actorRole={profile.role === "admin" ? "admin" : "dispatcher"}
        hospitals={hospitalsRes as Hospital[]}
        drivers={driversRes as Driver[]}
      />
    </AppShell>
  );
}