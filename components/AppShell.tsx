"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { DeskAlertProvider, useDeskAlerts } from "@/components/alerts/DeskAlertProvider";

function DeskAlertControls() {
  const { muted, toggleMute, playTestAlert, requestPermission, permissionGranted } = useDeskAlerts();

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={toggleMute}
        className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md text-xs font-semibold border transition-all ${
          muted
            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
        }`}
        title={muted ? "Sound Alerts Muted (Click to Unmute)" : "Sound Alerts Active (Click to Mute)"}
        aria-label="Toggle alert sound"
      >
        <span className="sm:hidden">{muted ? "🔇" : "🔊"}</span>
        <span className="hidden sm:inline">{muted ? "🔇 Muted" : "🔊 Sound"}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (!permissionGranted) {
            requestPermission();
          } else {
            playTestAlert("urgent");
          }
        }}
        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--border)] transition-all"
        title="Test emergency alert sound and notification"
      >
        <span>⚡ Test</span>
      </button>
    </div>
  );
}

const NAV: Record<string, { href: string; label: string }[]> = {
  driver: [{ href: "/driver", label: "Ambulance Console" }],
  dispatcher: [
    { href: "/dispatcher", label: "Active requests" },
    { href: "/dispatcher/reviews", label: "⭐ Patient Reviews" },
  ],
  hospital: [
    { href: "/hospital", label: "Incoming" },
    { href: "/hospital/history", label: "History" },
  ],
  admin: [
    { href: "/admin", label: "Network queue" },
    { href: "/admin/history", label: "📜 Emergency History" },
    { href: "/admin/reviews", label: "⭐ Patient Reviews" },
    { href: "/driver", label: "Ambulance View" },
    { href: "/admin/hospitals", label: "Hospitals" },
    { href: "/admin/approvals", label: "Approvals" },
    { href: "/admin/drivers", label: "Drivers" },
    { href: "/admin/branding", label: "App Logo & Branding" },
    { href: "/admin/staff", label: "Staff" },
    { href: "/admin/analytics", label: "Analytics" },
  ],
};

export function AppShell({
  profile,
  driverUnitId,
  children,
}: {
  profile: Profile;
  driverUnitId?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[profile.role] ?? [];
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.hasAttribute("data-theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    setTheme(currentTheme);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ops_theme", next);
    } catch {}
  }

  // 30-minute idle session timeout for clinical / ops workstations
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 30 minutes = 1800000 ms
      timeoutId = setTimeout(async () => {
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.replace("/login?error=Session+timed+out+due+to+inactivity");
        } catch {
          // ignore
        }
      }, 30 * 60 * 1000);
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--border)]"
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      aria-label="Toggle theme"
    >
      <span>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</span>
    </button>
  );

  const nav = (
    <>
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/solace_icon.png"
          alt="Solace EMS"
          className="w-10 h-10 rounded-xl shadow-md shrink-0 object-contain"
        />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00D4FF]">
            SOLACE EMS
          </div>
          <div className="text-sm font-bold text-white truncate">Emergency Fleet</div>
        </div>
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
              className={`block rounded-md px-3 py-2.5 text-[15px] md:text-[13px] font-medium transition-colors ${
                active
                  ? "bg-white/15 text-white font-semibold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-xs">
        <div className="font-medium truncate text-white">
          {profile.display_name || profile.email || "Signed in"}
        </div>
        <div className="text-white/60 mt-0.5 capitalize">{profile.role}</div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={signOut}
            className="text-white/70 hover:text-white underline-offset-2 hover:underline"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="text-[11px] text-white/80 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-all"
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <DeskAlertProvider profile={profile} driverUnitId={driverUnitId}>
      <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
        <aside className="hidden md:flex bg-[#12141a] text-white flex-col min-h-dvh">
          {nav}
        </aside>

        {open && (
          <div className="md:hidden fixed inset-0 z-40">
            <button
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <aside className="relative z-50 h-full w-[min(80vw,280px)] bg-[#12141a] text-white flex flex-col shadow-2xl">
              {nav}
            </aside>
          </div>
        )}

        <main className="min-w-0">
          <header className="sticky top-0 z-30 h-13 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-2 px-3 md:px-6 text-sm text-[var(--foreground)] transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <button
                className="md:hidden btn btn-ghost px-2 py-1 text-xs"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                ☰
              </button>
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-xs tracking-wider uppercase text-[var(--muted)] hidden xs:inline">
                  Ops
                </span>
                <span className="capitalize text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] truncate">
                  {profile.role}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <DeskAlertControls />
              {themeButton}
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border transition-all border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                title="Sign out of operational desk"
              >
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </header>
          <div className="p-3 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </main>
      </div>
    </DeskAlertProvider>
  );
}
