import { AppShell } from "@/components/AppShell";
import { StaffManager } from "@/components/StaffManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital, Profile } from "@/lib/types";

export default async function StaffPage() {
  const { supabase, profile } = await requireProfile("admin");
  const [{ data: staff }, { data: hospitals, error: hospErr }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, role, hospital_id, display_name")
        .order("role"),
      supabase.rpc("admin_list_hospitals"),
    ]);

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Manage staff</h1>
        <p className="text-sm text-[var(--muted)]">
          New accounts are created on the server with the service role, then
          assigned through assign_profile_role. The key never ships to the
          browser.
        </p>
        {hospErr && (
          <p className="text-sm text-[#b42318] mt-1">{hospErr.message}</p>
        )}
      </div>
      <StaffManager
        staff={(staff ?? []) as Profile[]}
        hospitals={((hospitals ?? []) as Hospital[]).map((h) => ({
          id: h.id,
          name: h.name,
        }))}
      />
    </AppShell>
  );
}
