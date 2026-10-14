import { AppShell } from "@/components/AppShell";
import { StaffManager } from "@/components/StaffManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital, Profile } from "@/lib/types";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StaffPage() {
  const { supabase, profile } = await requireProfile("admin");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let userMap = new Map<string, string>();

  if (serviceKey) {
    try {
      const adminClient = createServiceClient(getSupabaseUrl(), serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await adminClient.auth.admin.listUsers();
      if (data?.users) {
        userMap = new Map(data.users.map((u) => [u.id, u.email || ""]));
      }
    } catch {
      // fallback
    }
  }

  const [{ data: staff }, { data: hospitals, error: hospErr }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, role, hospital_id, display_name")
        .order("role"),
      supabase.rpc("admin_list_hospitals"),
    ]);

  const enrichedStaff = ((staff ?? []) as Profile[]).map((s) => ({
    ...s,
    email: userMap.get(s.user_id) || s.email || "—",
  }));

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Manage staff & hospital desk accounts</h1>
        <p className="text-sm text-[var(--muted)]">
          Manage operational accounts for dispatchers, hospital intake desks, and ambulance drivers across all pilot networks.
        </p>
        {hospErr && (
          <p className="text-sm text-[#b42318] mt-1">{hospErr.message}</p>
        )}
      </div>
      <StaffManager
        staff={enrichedStaff}
        hospitals={((hospitals ?? []) as Hospital[]).map((h) => ({
          id: h.id,
          name: h.name,
        }))}
      />
    </AppShell>
  );
}
