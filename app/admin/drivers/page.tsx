import { AppShell } from "@/components/AppShell";
import {
  DriverActivation,
  type DriverRow,
} from "@/components/DriverActivation";
import { requireProfile } from "@/lib/auth";

export default async function DriversPage() {
  const { supabase, profile } = await requireProfile("admin");
  const { data, error } = await supabase
    .from("drivers")
    .select(
      "id, display_name, vehicle_label, hospital_id, active, hospital:hospitals(name)",
    )
    .order("display_name");

  const drivers = ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const hospital = r.hospital as { name: string } | { name: string }[] | null;
    const name = Array.isArray(hospital) ? hospital[0]?.name : hospital?.name;
    return { ...r, hospital: name ? { name } : null } as DriverRow;
  });

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
      <DriverActivation drivers={drivers} />
    </AppShell>
  );
}
