import { AppShell } from "@/components/AppShell";
import { PilotMetricsCockpit } from "@/components/PilotMetricsCockpit";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PilotMetricsPage() {
  const { profile } = await requireProfile(["admin", "dispatcher"]);

  return (
    <AppShell profile={profile}>
      <PilotMetricsCockpit />
    </AppShell>
  );
}
