import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, Phone, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Solace EMS — Emergency Request & Ambulance Dispatch Network",
  description:
    "Rapid emergency medical response, pre-hospital coordination, and direct receiving hospital integration across Southwestern Nigeria.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col antialiased">
      {/* Top Operations Notice */}
      <div className="bg-[#0D111A] border-b border-white/5 px-4 py-2 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              24/7 Operations
            </span>
            <span className="text-slate-500 hidden sm:inline">·</span>
            <span className="text-slate-300">
              Pre-Hospital Coordination &amp; Ambulance Dispatch Network
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="hidden md:inline">Central Dispatch Desk:</span>
            <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
              <Phone className="w-3 h-3 text-emerald-400" />
              Rapid Response Helpline
            </span>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 bg-[#07090E]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Official Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/solace_icon.png"
              alt="Solace EMS Logo"
              className="w-9 h-9 rounded-xl object-contain shadow-md border border-white/10 group-hover:border-[#00D4FF]/40 transition-colors"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-[0.14em] text-white group-hover:text-[#00D4FF] transition-colors">
                  SOLACE
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25">
                  EMS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wide font-medium">
                Emergency Fleet Network
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Link href="/#how-it-works" className="hover:text-[#00D4FF] transition-colors">
              How It Works
            </Link>
            <Link href="/#who-its-for" className="hover:text-[#00D4FF] transition-colors">
              Stakeholders
            </Link>
            <Link href="/#safety" className="hover:text-[#00D4FF] transition-colors">
              Trust &amp; Safety
            </Link>
            <Link href="/download" className="hover:text-[#00D4FF] transition-colors">
              Mobile App
            </Link>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-3">
            {/* Single Distinct Staff Sign In Entry */}
            <Link
              href="/login?reauth=1"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white rounded-lg border border-white/15 hover:border-white/30 hover:bg-white/5 transition-all"
            >
              Staff Sign In
            </Link>

            {/* Public Action CTA */}
            <Link
              href="/download"
              className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Get App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>

      {/* Unified Professional Footer */}
      <footer className="bg-[#05060A] border-t border-white/5 text-slate-400 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Information */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/solace_icon.png"
                  alt="Solace EMS"
                  className="w-7 h-7 rounded-lg object-contain shadow-sm"
                />
                <span className="text-white font-black tracking-wider text-xs uppercase">
                  SOLACE EMS
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                Pre-hospital coordination, rapid emergency dispatch, and audited receiving hospital integration for acute trauma and obstetric emergencies.
              </p>
              <div className="flex items-center gap-1.5 pt-1 text-emerald-400 font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Clinical Governance Standard</span>
              </div>
            </div>

            {/* Public Quick Links */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Network Information
              </div>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href="/#how-it-works" className="hover:text-slate-200 transition-colors">
                    Emergency Transit Lifecycle
                  </Link>
                </li>
                <li>
                  <Link href="/#who-its-for" className="hover:text-slate-200 transition-colors">
                    Participating Care Providers
                  </Link>
                </li>
                <li>
                  <Link href="/#safety" className="hover:text-slate-200 transition-colors">
                    Clinical Governance &amp; Protocols
                  </Link>
                </li>
                <li>
                  <Link href="/download" className="hover:text-emerald-400 transition-colors font-semibold">
                    Download Mobile App
                  </Link>
                </li>
              </ul>
            </div>

            {/* Authorized Operations Entry (Exactly ONE Staff Link) */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Authorized Personnel
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Registered dispatchers, ambulance personnel, and hospital intake staff can access operational consoles via the secure sign-in portal.
              </p>
              <div className="pt-2 flex flex-col gap-1.5">
                <Link
                  href="/request-access"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-semibold"
                >
                  <span>Request Staff Access →</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <span>Staff Portal Sign In</span>
                </Link>
              </div>
            </div>

            {/* General Contact */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Operational Support
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                For administrative inquiries, health partner onboarding, or patient assistance, contact our central operations desk.
              </p>
              <div className="pt-1 space-y-1 text-slate-300 text-[11px]">
                <div>Email: <span className="text-slate-200">contact@solace.health</span></div>
                <div>Status: <span className="text-emerald-400 font-medium">Network Operational</span></div>
              </div>
            </div>
          </div>

          {/* Legal / Copyright Bar */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} Solace Emergency Medical Services. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Emergency Dispatch Network</span>
              <span aria-hidden="true">·</span>
              <span>Regional Pre-Hospital Coordination</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
