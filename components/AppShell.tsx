"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { DeskAlertProvider, useDeskAlerts } from "@/components/alerts/DeskAlertProvider";
import {
  LayoutDashboard,
  Radio,
  Stethoscope,
  Building2,
  History,
  Star,
  Ambulance,
  ShieldCheck,
  UserCheck,
  Users,
  Palette,
  Shield,
  TrendingUp,
  Sun,
  Moon,
  LogOut,
  Bell,
  BellOff,
  Sparkles,
  Menu,
} from "lucide-react";

function DeskAlertControls() {
  const { muted, toggleMute, playTestAlert, requestPermission, permissionGranted } = useDeskAlerts();

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={toggleMute}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
          muted
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
        }`}
        title={muted ? "Sound Alerts Muted (Click to Unmute)" : "Sound Alerts Active (Click to Mute)"}
        aria-label="Toggle alert sound"
      >
        {muted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{muted ? "Muted" : "Alert Sound"}</span>
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
        className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--border)] transition-all"
        title="Test emergency alert sound and notification"
      >
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span>Test Sound</span>
      </button>
    </div>
  );
}

function getNavIcon(href: string) {
  if (href.startsWith("/referral")) return <Stethoscope className="w-4 h-4 shrink-0 text-purple-400" />;
  if (href.startsWith("/dispatcher/reviews") || href.startsWith("/admin/reviews")) return <Star className="w-4 h-4 shrink-0 text-amber-400" />;
  if (href.startsWith("/dispatcher")) return <Radio className="w-4 h-4 shrink-0 text-blue-400" />;
  if (href.startsWith("/hospital/history") || href.startsWith("/admin/history")) return <History className="w-4 h-4 shrink-0 text-cyan-400" />;
  if (href.startsWith("/hospital")) return <Building2 className="w-4 h-4 shrink-0 text-teal-400" />;
  if (href.startsWith("/driver")) return <Ambulance className="w-4 h-4 shrink-0 text-emerald-400" />;
  if (href.startsWith("/admin/hospitals")) return <ShieldCheck className="w-4 h-4 shrink-0 text-teal-400" />;
  if (href.startsWith("/admin/approvals")) return <UserCheck className="w-4 h-4 shrink-0 text-blue-400" />;
  if (href.startsWith("/admin/drivers")) return <Users className="w-4 h-4 shrink-0 text-indigo-400" />;
  if (href.startsWith("/admin/branding")) return <Palette className="w-4 h-4 shrink-0 text-purple-400" />;
  if (href.startsWith("/admin/staff")) return <Shield className="w-4 h-4 shrink-0 text-slate-400" />;
  if (href.startsWith("/admin/analytics")) return <TrendingUp className="w-4 h-4 shrink-0 text-rose-400" />;
  return <LayoutDashboard className="w-4 h-4 shrink-0 text-slate-400" />;
}

const NAV: Record<string, { href: string; label: string }[]> = {
  driver: [{ href: "/driver", label: "Ambulance Console" }],
  dispatcher: [
    { href: "/dispatcher", label: "Active Requests Board" },
    { href: "/referral", label: "PHC Transfer Intake (Stage A)" },
    { href: "/dispatcher/reviews", label: "Patient Reviews" },
  ],
  hospital: [
    { href: "/hospital", label: "Incoming ER Intake" },
    { href: "/referral", label: "PHC Transfer Intake" },
    { href: "/hospital/history", label: "Handover History" },
  ],
  admin: [
    { href: "/admin", label: "Network Dispatch Queue" },
    { href: "/referral", label: "PHC Transfer Intake (Stage A)" },
    { href: "/admin/history", label: "Emergency History" },
    { href: "/admin/reviews", label: "Patient Reviews" },
    { href: "/driver", label: "Ambulance View" },
    { href: "/admin/hospitals", label: "Hospitals & Capacity" },
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
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--border)]"
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-slate-700" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );

  const nav = (
    <>
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/solace_icon.png"
          alt="Solace EMS"
          className="w-10 h-10 rounded-xl shadow-md shrink-0 object-contain ring-1 ring-white/15"
        />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00D4FF]">
            SOLACE EMS
          </div>
          <div className="text-sm font-bold text-white truncate">Emergency Fleet</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isPending = pendingHref === item.href;
          const active =
            isPending ||
            pathname === item.href ||
            (item.href !== `/${profile.role}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => {
                setOpen(false);
                if (pathname !== item.href) {
                  setPendingHref(item.href);
                }
              }}
              className={`flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-[14px] md:text-[12.5px] font-medium transition-all ${
                active
                  ? "bg-white/15 text-white font-semibold shadow-xs ring-1 ring-white/20"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {getNavIcon(item.href)}
                <span className="truncate">{item.label}</span>
              </div>
              {isPending && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase">
            {(profile.display_name || profile.role || "U").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate text-white text-[12px]">
              {profile.display_name || profile.email || "Signed in"}
            </div>
            <div className="text-white/60 text-[10.5px] capitalize">{profile.role}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1 text-white/70 hover:text-white text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="text-[11px] text-white/80 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-all flex items-center gap-1"
          >
            {theme === "dark" ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3" />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <DeskAlertProvider profile={profile} driverUnitId={driverUnitId}>
      {pendingHref && (
        <div className="fixed top-0 left-0 right-0 h-[3px] z-[100] bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 animate-pulse shadow-sm" />
      )}
      <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
        <aside className="hidden md:flex bg-[#0b0f19] border-r border-slate-800/80 text-white flex-col min-h-dvh">
          {nav}
        </aside>

        {open && (
          <div className="md:hidden fixed inset-0 z-40">
            <button
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <aside className="relative z-50 h-full w-[min(80vw,280px)] bg-[#0b0f19] border-r border-slate-800/80 text-white flex flex-col shadow-2xl">
              {nav}
            </aside>
          </div>
        )}

        <main className="min-w-0">
          <header className="sticky top-0 z-30 h-14 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md flex items-center justify-between gap-3 px-3 md:px-6 text-sm text-[var(--foreground)] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                className="md:hidden btn btn-ghost px-2 py-1 text-xs"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 truncate">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Grid Live · 24/7 Fleet</span>
                </div>
                <span className="capitalize text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] truncate">
                  {profile.role}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <DeskAlertControls />
              {themeButton}
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                title="Sign out of operational desk"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
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
