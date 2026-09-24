import { AppShell } from "@/components/AppShell";
import { HospitalCapacity } from "@/components/HospitalCapacity";
import { HospitalCards } from "@/components/HospitalCards";
import { requireProfile } from "@/lib/auth";
import { fetchRequests, fetchTransitionRules } from "@/lib/queries";

export default async function HospitalPage() {
  const { supabase, profile } = await requireProfile("hospital");

  const hospitalId = profile.hospital_id;
  let capacity: number | null = null;
  if (hospitalId) {
    const { data } = await supabase
      .from("hospitals")
      .select("available_capacity")
      .eq("id", hospitalId)
      .maybeSingle();
    capacity = data?.available_capacity ?? null;
  }

  const [requests, rules] = await Promise.all([
    hospitalId
      ? fetchRequests(supabase, { hospitalId, activeOnly: true })
      : Promise.resolve([]),
    fetchTransitionRules(supabase, "hospital"),
  ]);

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Hospital intake</h1>
        <p className="text-sm text-[var(--muted)]">
          Requests scoped to your hospital (RLS + hospital_id filter).
        </p>
      </div>
      {hospitalId ? (
        <div className="space-y-4">
          <HospitalCapacity hospitalId={hospitalId} value={capacity} />
          <HospitalCards requests={requests} rules={rules} />
        </div>
      ) : (
        <p className="text-sm text-[#b42318]">
          This account has no hospital_id on its profile. Ask an admin to
          attach it.
        </p>
      )}
    </AppShell>
  );
}
