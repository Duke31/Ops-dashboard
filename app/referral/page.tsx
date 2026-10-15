import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
import type { Hospital } from "@/lib/types";
import { PHCReferralForm } from "./PHCReferralForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReferralPage() {
  const { supabase, profile } = await requireProfile([
    "dispatcher",
    "admin",
    "hospital",
    "client",
  ]);

  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id, name, address, available_capacity")
    .order("name");

  return (
    <AppShell profile={profile}>
      <div className="max-w-4xl mx-auto space-y-6">
        <PHCReferralForm
          hospitals={(hospitals as Hospital[]) || []}
          userDisplayName={profile.display_name || ""}
          userRole={profile.role}
        />
      </div>
    </AppShell>
  );
}
