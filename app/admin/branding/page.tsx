import { AppShell } from "@/components/AppShell";
import { BrandingStudio } from "@/components/BrandingStudio";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBrandingPage() {
  const { profile } = await requireProfile("admin");

  return (
    <AppShell profile={profile}>
      <BrandingStudio />
    </AppShell>
  );
}
