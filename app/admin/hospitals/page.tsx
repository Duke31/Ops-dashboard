import { AppShell } from "@/components/AppShell";
import { HospitalManager } from "@/components/HospitalManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital } from "@/lib/types";

type Row = {
  hospital_id: string | null;
  hospital?: { name?: string } | { name?: string }[] | null;
};

function nameOf(h: Row["hospital"]): string | null {
  const row = Array.isArray(h) ? h[0] : h;
  return row?.name ?? null;
}

export default async function HospitalsPage() {
  const { supabase, profile } = await requireProfile("admin");

  const [fromProfiles, fromDrivers] = await Promise.all([
    supabase.from("profiles").select("hospital_id, hospital:hospitals(name)"),
    supabase.from("drivers").select("hospital_id, hospital:hospitals(name)"),
  ]);

  const byId = new Map<string, Hospital>();
  const ingest = (rows: Row[] | null) => {
    for (const row of rows ?? []) {
      if (!row.hospital_id) continue;
      const existing = byId.get(row.hospital_id);
      const label = nameOf(row.hospital);
      byId.set(row.hospital_id, {
        id: row.hospital_id,
        name: label || existing?.name || "Linked hospital",
        address: existing?.address ?? null,
        available_capacity: null,
      });
    }
  };
  ingest((fromProfiles.data ?? []) as Row[]);
  ingest((fromDrivers.data ?? []) as Row[]);

  const hospitals = [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Manage hospitals</h1>
        <p className="text-sm text-[var(--muted)]">
          List = hospital_id already on staff or drivers. Lekki shows after a
          desk or driver is linked to it.
        </p>
      </div>
      <HospitalManager hospitals={hospitals} />
    </AppShell>
  );
}
