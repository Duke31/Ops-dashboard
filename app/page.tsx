import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { homeForRole } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/env";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }
  try {
    const { profile } = await requireProfile();
    redirect(homeForRole(profile.role));
  } catch {
    redirect("/login");
  }
}
