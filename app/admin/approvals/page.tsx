import { AppShell } from "@/components/AppShell";
import { RoleRequests, type RoleRequestRow } from "@/components/RoleRequests";
import { requireProfile } from "@/lib/auth";

export default async function ApprovalsPage() {
  const { supabase, profile } = await requireProfile("admin");
  const { data, error } = await supabase
    .from("role_requests")
    .select(
      "id, requested_role, display_name, hospital_id, vehicle_label, notes, created_at, hospital:hospitals(name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const hospital = r.hospital as { name: string } | { name: string }[] | null;
    const name = Array.isArray(hospital) ? hospital[0]?.name : hospital?.name;
    return { ...r, hospital: name ? { name } : null } as RoleRequestRow;
  });

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Role request approvals</h1>
        <p className="text-sm text-[var(--muted)]">
          Approve or reject through admin_review_role_request.
        </p>
        {error && (
          <p className="text-sm text-[#b42318] mt-1">{error.message}</p>
        )}
      </div>
      <RoleRequests rows={rows} />
    </AppShell>
  );
}
