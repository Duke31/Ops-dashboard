import { AppShell } from "@/components/AppShell";
import { PilotMetricsView } from "@/components/PilotMetricsView";
import { requireProfile } from "@/lib/auth";
import { fetchRequests } from "@/lib/queries";
import type { Hospital } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PilotMetricsPage() {
  const { supabase, profile } = await requireProfile(["admin", "dispatcher"]);

  const [requests, hospitalsRes] = await Promise.all([
    fetchRequests(supabase, { activeOnly: false }),
    supabase
      .from("hospitals")
      .select("id, name, address, available_capacity, lat, lng, intake_phone")
      .order("name"),
  ]);

  return (
    <AppShell profile={profile}>
      <PilotMetricsView
        requests={requests}
        hospitals={(hospitalsRes.data as Hospital[]) || []}
      />
    </AppShell>
  );
}
