import { AppShell } from "@/components/AppShell";
import { HospitalManager } from "@/components/HospitalManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital, Profile } from "@/lib/types";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HospitalsPage() {
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

  const [{ data, error }, { data: profilesData }] = await Promise.all([
    supabase.rpc("admin_list_hospitals"),
    supabase
      .from("profiles")
      .select("user_id, role, hospital_id, display_name")
      .eq("role", "hospital"),
  ]);

  const enrichedHospitalProfiles = ((profilesData ?? []) as Profile[]).map((p) => ({
    ...p,
    email: userMap.get(p.user_id) || p.email || "—",
  }));

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Manage hospitals & facility desk profiles</h1>
        <p className="text-sm text-[var(--muted)]">
          Manage partner hospitals, regional pilot facilities (Ibadan Private, Osun OSEMSAS, Lagos), and assigned hospital desk logins.
        </p>
        {error && (
          <p className="text-sm text-[#b42318] mt-1">{error.message}</p>
        )}
      </div>
      <HospitalManager
        hospitals={(data ?? []) as Hospital[]}
        profiles={enrichedHospitalProfiles}
      />
    </AppShell>
  );
}
