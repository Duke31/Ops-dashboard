import { AppShell } from "@/components/AppShell";
import { HospitalManager } from "@/components/HospitalManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital } from "@/lib/types";

type Embed = {
  hospital:
    | {
        id?: string;
        name?: string;
        address?: string | null;
        lat?: number | null;
        lng?: number | null;
        intake_phone?: string | null;
      }
    | {
        id?: string;
        name?: string;
        address?: string | null;
        lat?: number | null;
        lng?: number | null;
        intake_phone?: string | null;
      }[]
    | null;
};

function unwrap(h: Embed["hospital"]): Hospital | null {
  const row = Array.isArray(h) ? h[0] : h;
  if (!row?.id) return null;
  return {
    id: String(row.id),
    name: String(row.name ?? "Hospital"),
    address: row.address ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    intake_phone: row.intake_phone ?? null,
    available_capacity: null,
  };
}

export default async function HospitalsPage() {
  const { supabase, profile } = await requireProfile("admin");

  const [fromProfiles, fromDrivers] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "hospital:hospitals(id, name, address, lat, lng, intake_phone)",
      ),
    supabase
      .from("drivers")
      .select(
        "hospital:hospitals(id, name, address, lat, lng, intake_phone)",
      ),
  ]);

  const byId = new Map<string, Hospital>();
  for (const row of (fromProfiles.data ?? []) as Embed[]) {
    const h = unwrap(row.hospital);
    if (h) byId.set(h.id, h);
  }
  for (const row of (fromDrivers.data ?? []) as Embed[]) {
    const h = unwrap(row.hospital);
    if (h) byId.set(h.id, h);
  }

  const hospitals = [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Manage hospitals</h1>
        <p className="text-sm text-[var(--muted)]">
          Saves through admin_save_hospital. List comes from profiles/drivers
          (RLS blocks a raw hospitals select).
        </p>
      </div>
      <HospitalManager hospitals={hospitals} />
    </AppShell>
  );
}
