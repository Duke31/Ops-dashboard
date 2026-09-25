"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const NAV: Record<string, { href: string; label: string }[]> = {
  dispatcher: [{ href: "/dispatcher", label: "Active requests" }],
  hospital: [{ href: "/hospital", label: "Incoming" }],
  admin: [
    { href: "/admin", label: "Network queue" },
    { href: "/admin/hospitals", label: "Hospitals" },
    { href: "/admin/approvals", label: "Approvals" },
    { href: "/admin/drivers", label: "Drivers" },
    { href: "/admin/staff", label: "Staff" },
    { href: "/admin/analytics", label: "Analytics" },
  ],
};

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[profile.role] ?? [];
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <>
      <div className="px-4 py-4 border-b border-white/10">
        <div className="text-[11px] uppercase tracking-[0.14em] text-white/50">
          Ops Dashboard
        </div>
        <div className="mt-1 text-sm font-semibold">Emergency Dispatch</div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `/${profile.role}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2.5 text-[15px] md:text-[13px] ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-xs">
        <div className="font-medium truncate">
          {profile.display_name || profile.email || "Signed in"}
        </div>
        <div className="text-white/50 mt-0.5 capitalize">{profile.role}</div>
        <button
          onClick={signOut}
          className="mt-3 text-white/70 hover:text-white underline-offset-2 hover:underline"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden md:flex bg-[#12141a] text-white flex-col min-h-dvh">
        {nav}
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-50 h-full w-[min(80vw,280px)] bg-[#12141a] text-white flex flex-col">
            {nav}
          </aside>
        </div>
      )}

      <main className="min-w-0">
        <header className="sticky top-0 z-30 h-12 border-b border-[var(--line)] bg-white flex items-center gap-3 px-3 md:px-6 text-sm text-[var(--muted)]">
          <button
            className="md:hidden btn btn-ghost px-2 py-1"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            Menu
          </button>
          <span className="truncate">Live operations</span>
        </header>
        <div className="p-3 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </main>
    </div>
  );
}
