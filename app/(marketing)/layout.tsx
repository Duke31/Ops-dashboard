import type { ReactNode } from "react";
import Link from "next/link";
import { Ambulance, ArrowRight, Phone, MessageSquare, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Solace EMS — Pre-Hospital Coordination & Maternal Emergency Transit",
  description:
    "Closing the survival gap across Southwestern Nigeria (Ibadan & Osogbo). Real-time emergency vehicle telematics, direct ER intake integration, and specialized maternal transit.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 selection:bg-emerald-500 selection:text-black flex flex-col antialiased">
      {/* Top Banner Announcement */}
      <div className="bg-[#11141E] border-b border-white/5 px-4 py-2 text-xs text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Pilot Live
            </span>
            <span className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-slate-300">
              Southwestern Nigeria Pilot Corridors: Ibadan &amp; Osogbo
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="hidden md:inline">24/7 Operations Desk:</span>
            <a
              href="tel:+2348133355709"
              className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors font-mono"
            >
              <Phone className="w-3 h-3 text-emerald-400" />
              +234 813 335 5709
            </a>
          </div>
        </div>
      </div>

      {/* Main Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#090A0F]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Platform Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
              <Ambulance className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  SOLACE
                </span>
                <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/10 uppercase">
                  EMS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wide font-medium">
                Clinical Dispatch &amp; Transit
              </p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
            <Link
              href="/#features"
              className="hover:text-emerald-400 transition-colors text-xs uppercase tracking-wider font-semibold"
            >
              Platform Core
            </Link>
            <Link
              href="/#safe-delivery"
              className="hover:text-emerald-400 transition-colors text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Safe Delivery Pass
            </Link>
            <Link
              href="/#hospitals"
              className="hover:text-emerald-400 transition-colors text-xs uppercase tracking-wider font-semibold"
            >
              For Hospitals
            </Link>
            <Link
              href="/#pilot-regions"
              className="hover:text-emerald-400 transition-colors text-xs uppercase tracking-wider font-semibold"
            >
              Corridors
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/hospital"
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              Hospital Desk
            </Link>

            <Link
              href="/download"
              className="px-3.5 py-1.5 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm shadow-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              <span>Get Mobile App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Global Footer */}
      <footer className="bg-[#07080C] border-t border-white/5 text-slate-400 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Col */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-black font-black text-xs">
                  S
                </div>
                <span className="text-white font-bold tracking-tight text-sm">
                  SOLACE EMS
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                Pre-hospital telematics, automated emergency dispatch, and audited clinical handover designed for Southwestern Nigerian transport networks.
              </p>
              <div className="flex items-center gap-2 pt-1 text-emerald-400 font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Delay Emergency Standard</span>
              </div>
            </div>

            {/* Platform Col */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Navigation
              </div>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href="/#features" className="hover:text-slate-200 transition-colors">
                    Emergency Telematics &amp; GPS
                  </Link>
                </li>
                <li>
                  <Link href="/#safe-delivery" className="hover:text-slate-200 transition-colors">
                    Obstetric &amp; Maternal Pass
                  </Link>
                </li>
                <li>
                  <Link href="/#hospitals" className="hover:text-slate-200 transition-colors">
                    Hospital Bed &amp; Triage Desk
                  </Link>
                </li>
                <li>
                  <Link href="/download" className="hover:text-emerald-400 transition-colors font-semibold">
                    Download Android APK (v1.0.2)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Operational Desk Access */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Operational Desks
              </div>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href="/hospital" className="hover:text-emerald-400 transition-colors">
                    Hospital Intake Console →
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-slate-200 transition-colors">
                    Dispatcher &amp; Admin Sign In →
                  </Link>
                </li>
                <li>
                  <Link href="/hospital/history" className="hover:text-slate-200 transition-colors">
                    Clinical Handover Archives
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact & Pilot Notice */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Pilot Operations
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Operating in partnership with primary and tertiary health facilities, including OAUTHC complex annexes, private maternity homes, and regional fleet teams.
              </p>
              <div className="pt-1 space-y-1 text-slate-300 font-mono text-[11px]">
                <div>Email: <a href="mailto:samueloluwapelumi55@gmail.com" className="hover:underline text-slate-200">samueloluwapelumi55@gmail.com</a></div>
                <div>Hotline: <a href="tel:+2348133355709" className="hover:underline text-emerald-400">+234 813 335 5709</a></div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} Solace EMS. Southwestern Nigeria Emergency Operations. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Ibadan: Ring Road · Iwo Road · Bodija</span>
              <span aria-hidden="true">·</span>
              <span>Osogbo: Oke-Fia · Ogo-Oluwa · Biket</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
