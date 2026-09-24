import { AppShell } from "@/components/AppShell";
import { StaffManager } from "@/components/StaffManager";
import { requireProfile } from "@/lib/auth";
import type { Hospital, Profile } from "@/lib/types";

export default async function StaffPage() {
  const { supabase, profile } = await requireProfile("admin");
  const [{ data: staff }, { data: hospitals }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, role, hospital_id, display_name")
      .order("role"),
    supabase.from("hospitals").select("id, name").order("name"),
  ]);

  return (
    <AppShell profile={profile}>
      <div className="mb-4">
        <h1 className="text-lg font-semibold">Manage staff</h1>
        <p className="text-sm text-[var(--muted)] max-w-2xl">
          Role cannot be self-assigned from the client. Account creation must
          use a service-role Edge Function or server action. That privileged
          path is intentionally not implemented yet — confirm the design
          below before it is written.
        </p>
      </div>
      <StaffManager
        staff={(staff ?? []) as Profile[]}
        hospitals={(hospitals ?? []) as Pick<Hospital, "id" | "name">[]}
      />
    </AppShell>
  );
}
