import { AppShell } from "@/components/AppShell";
import { RoleRequests } from "@/components/RoleRequests";
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
      <RoleRequests rows={data ?? []} />
    </AppShell>
  );
}
