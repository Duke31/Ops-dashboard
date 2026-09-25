import { AppShell } from "@/components/AppShell";
import { DriverActivation } from "@/components/DriverActivation";
import { requireProfile } from "@/lib/auth";

export default async function DriversPage() {
  const { supabase, profile } = await requireProfile("admin");
  const { data, error } = await supabase
    .from("drivers")
    .select(
      "id, display_name, vehicle_label, hospital_id, active, hospital:hospitals(name)",
    )
    .order("display_name");

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Driver activation</h1>
        <p className="text-sm text-[var(--muted)]">
          New units stay inactive until you flip them via
          admin_set_driver_active.
        </p>
        {error && (
          <p className="text-sm text-[#b42318] mt-1">{error.message}</p>
        )}
      </div>
      <DriverActivation drivers={data ?? []} />
    </AppShell>
  );
}
