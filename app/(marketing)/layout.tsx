import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";

export const metadata = {
  title: "Solace EMS — Emergency Request & Ambulance Dispatch Network",
  description:
    "Rapid emergency medical response, pre-hospital coordination, and direct receiving hospital integration across Southwestern Nigeria.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col antialiased">
      {/* Responsive Navigation Bar with Mobile Dropdown (Top banner completely removed) */}
      <MarketingNav />

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
                Registered dispatchers, ambulance personnel, and hospital intake staff can access operational consoles via the secure sign-in portal. Access is managed by system administrators.
              </p>
              <div className="pt-2">
                <Link
                  href="/login?reauth=1"
                  className="inline-flex items-center gap-1.5 text-xs text-[#00D4FF] hover:underline font-semibold"
                >
                  <span>Staff Portal Sign In →</span>
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
