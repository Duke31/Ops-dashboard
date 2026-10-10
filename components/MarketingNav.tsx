"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, ShieldCheck } from "lucide-react";

export default function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#who-its-for", label: "Stakeholders" },
    { href: "/#obstetric-care", label: "Maternal Care" },
    { href: "/#safety", label: "Trust & Safety" },
    { href: "/download", label: "Mobile App" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#07090E]/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-3 group shrink-0"
        >
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
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[#00D4FF] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Staff Sign In - Compact on mobile */}
          <Link
            href="/login?reauth=1"
            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white rounded-lg border border-white/15 hover:border-white/30 hover:bg-white/5 transition-all whitespace-nowrap"
          >
            Staff Sign In
          </Link>

          {/* Client Registration CTA */}
          <Link
            href="/register"
            className="px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1 whitespace-nowrap"
          >
            <span>Sign Up</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* App Download Link (Desktop) */}
          <Link
            href="/download"
            className="hidden md:inline-flex px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all whitespace-nowrap"
          >
            Get App
          </Link>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0D111A] border-b border-white/10 px-4 pt-3 pb-5 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-emerald-400 hover:bg-white/5 uppercase tracking-wider transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <Link
              href="/login?reauth=1"
              onClick={() => setMobileMenuOpen(false)}
              className="sm:hidden w-full py-2.5 px-3 rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:text-white text-xs font-semibold text-center transition-colors"
            >
              Staff Sign In
            </Link>
            <Link
              href="/download"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-semibold text-center transition-colors"
            >
              Download Mobile App (Android APK)
            </Link>
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 pt-1">
              <span>Emergency fleet telematics</span>
              <span className="text-emerald-400 font-mono">24/7 Ops Ready</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
