"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Phone,
  MessageSquare,
  ArrowLeft,
  Settings,
  FolderOpen,
  HelpCircle,
  FileDown,
} from "lucide-react";

export default function DownloadPage() {
  const [copied, setCopied] = useState(false);

  // Dynamic remote Supabase bucket URL based on environment or production fallback
  const supabaseBaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aogknxtyvzpzqkgmgtsv.supabase.co";
  const apkDownloadUrl = `${supabaseBaseUrl.replace(/\/$/, "")}/storage/v1/object/public/app-releases/solace-v1.0.apk`;

  const copyDownloadLink = async () => {
    try {
      await navigator.clipboard.writeText(apkDownloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-12">
      {/* Back Link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>
      </div>

      {/* 1. HERO DOWNLOAD CARD */}
      <div className="rounded-3xl bg-[#11141E] border border-white/10 p-6 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl">
        {/* Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-3xl -z-10 rounded-full"
        />

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Official Release</span>
            </div>
            <div className="text-xs font-mono text-slate-400">
              SHA-256 Verified Binary
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Install Solace for Android
          </h1>

          {/* Version Specs */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono pt-1">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400 font-bold">
              v1.0.2 Pilot Build
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Size: ~28 MB</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Requires: Android 8.0+</span>
          </div>

          {/* Unified APK Notice */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Unified Multi-Role Build:</strong> Single unified APK for Citizens, Expectant Mothers, and Certified Ambulance Responders. Driver operational mode unlocks automatically upon phone verification.
            </div>
          </div>
        </div>

        {/* Big Action Download Button */}
        <div className="space-y-3 pt-2">
          <a
            href={apkDownloadUrl}
            download="solace-v1.0.apk"
            className="w-full py-4 px-6 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3 active:scale-[0.99] group text-center"
          >
            <Download className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span>DOWNLOAD SOLACE APK (DIRECT)</span>
          </a>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct install from remote verified cloud storage</span>
            </div>

            <button
              onClick={copyDownloadLink}
              type="button"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? "Link Copied to Clipboard!" : "Copy Direct Download Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STEP-BY-STEP INSTALLATION VISUAL GUIDE */}
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
            Installation Walkthrough
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            How to Install Outside the Google Play Store
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Because Solace is distributed directly during this regional clinical pilot, Android will show its standard unknown source confirmation prompts. Follow these 4 simple steps:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-[#11141E] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                1
              </span>
              <FileDown className="w-4 h-4 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-white">Tap &ldquo;Download Anyway&rdquo;</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When Google Chrome or Samsung Internet displays: <em className="text-slate-300">&ldquo;File might be harmful&rdquo;</em>, tap <strong>&ldquo;Download anyway&rdquo;</strong>. This standard warning appears for all APKs downloaded directly from websites.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-[#11141E] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                2
              </span>
              <FolderOpen className="w-4 h-4 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-white">Open the Downloaded File</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Once downloaded, tap the notification banner or navigate to your device&apos;s <strong>Files / Downloads</strong> app and tap <strong className="text-slate-200">solace-v1.0.apk</strong>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-[#11141E] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                3
              </span>
              <Settings className="w-4 h-4 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-white">Allow Unknown Sources</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If Android says <em className="text-slate-300">&ldquo;For your security, your phone is not allowed to install unknown apps&rdquo;</em>, tap <strong>Settings</strong> and toggle on <strong>&ldquo;Allow from this source&rdquo;</strong>.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl bg-[#11141E] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                4
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Tap &ldquo;Install&rdquo; &amp; Launch</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tap <strong>&ldquo;Install&rdquo;</strong>, wait 10 seconds for completion, then tap <strong>&ldquo;Open&rdquo;</strong>. Grant location permission so the emergency telemetry can pinpoint your location.
            </p>
          </div>
        </div>
      </div>

      {/* 3. DEVICE PERMISSIONS TRANSPARENCY */}
      <div className="p-6 rounded-2xl bg-[#11141E] border border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>Why Solace Requests Android Permissions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="space-y-1">
            <strong className="text-white block">Precise Location (GPS):</strong>
            <span>Allows dispatchers and ambulance drivers to locate patients without relying solely on manual landmarks or ambiguous street names.</span>
          </div>

          <div className="space-y-1">
            <strong className="text-white block">Phone Dialer &amp; SMS:</strong>
            <span>Enables one-tap local calls to the assigned ambulance driver and fallback SMS transmission during periods of weak cellular data.</span>
          </div>
        </div>
      </div>

      {/* 4. PILOT FEEDBACK & SUPPORT BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
            Need Help Installing?
          </div>
          <div className="text-sm font-bold text-white">
            Connect with our Southwestern Nigeria Tech Desk
          </div>
          <p className="text-xs text-slate-400">
            Available 24/7 for patient assistance, driver onboarding, and hospital coordination.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="https://wa.me/2348133355709?text=Hello%20Solace%20Support,%20I%20need%20assistance%20installing%20the%20pilot%20Android%20APK."
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Support</span>
          </a>

          <a
            href="tel:+2348133355709"
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Call Hotline</span>
          </a>
        </div>
      </div>
    </div>
  );
}
