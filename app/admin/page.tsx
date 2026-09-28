import { AppShell } from "@/components/AppShell";
import { RequestBoard } from "@/components/RequestBoard";
import { LogEmergencyForm } from "@/components/LogEmergencyForm";
import { TelemetryFleetBanner } from "@/components/TelemetryFleetBanner";
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
      supabase.from("hospitals").select("id, name, available_capacity").order("name"),
      supabase
        .from("drivers")
        .select("id, display_name, vehicle_label, hospital_id, active, last_location_at, current_lat, current_lng, battery_level, is_charging, network_type")
        .eq("active", true)
        .order("display_name"),
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
      <TelemetryFleetBanner
        drivers={(driversRes.data ?? []) as never}
        requests={requests}
      />
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