"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Copy,
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
      <div className="rounded-3xl bg-[#0D111A] border border-white/10 p-6 sm:p-10 space-y-8 relative overflow-hidden shadow-2xl">
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
              Verified Production Binary
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Install Solace Emergency App
          </h1>

          {/* Version Specs */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono pt-1">
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400 font-bold">
              v1.0.2 Build
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
              <strong className="text-white">Emergency Mobile Client:</strong> Enables instant emergency requests, real-time ambulance tracking radar, verified hospital destination routing, and responder contact.
            </div>
          </div>
        </div>

        {/* Big Action Download Button */}
        <div className="space-y-3 pt-2">
          <a
            href={apkDownloadUrl}
            download="solace-v1.0.apk"
            className="w-full py-4 px-6 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3 active:scale-[0.99] group text-center"
          >
            <Download className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span>DOWNLOAD SOLACE APK (DIRECT)</span>
          </a>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct installation package from verified storage</span>
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
            How to Install on Android
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Follow these standard steps to complete APK installation:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                1
              </span>
              <FileDown className="w-4 h-4 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-white">Tap &ldquo;Download Anyway&rdquo;</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When your browser prompts: <em className="text-slate-300">&ldquo;File might be harmful&rdquo;</em>, tap <strong>&ldquo;Download anyway&rdquo;</strong>. This standard prompt appears for all apps downloaded directly.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                2
              </span>
              <FolderOpen className="w-4 h-4 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-white">Open the Downloaded File</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Once downloaded, tap the notification banner or locate <strong className="text-slate-200">solace-v1.0.apk</strong> in your device&apos;s Downloads folder.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                3
              </span>
              <Settings className="w-4 h-4 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-white">Allow Installation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If prompted by system security to allow installing apps from this source, tap <strong>Settings</strong> and toggle on <strong>&ldquo;Allow from this source&rdquo;</strong>.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                4
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Install &amp; Launch</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tap <strong>&ldquo;Install&rdquo;</strong>, wait for completion, then tap <strong>&ldquo;Open&rdquo;</strong>. Grant location permission so emergency responders can locate you accurately.
            </p>
          </div>
        </div>
      </div>

      {/* 3. DEVICE PERMISSIONS TRANSPARENCY */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          <span>Device Permissions Explained</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="space-y-1">
            <strong className="text-white block">Precise Location (GPS):</strong>
            <span>Required so responding ambulances can be routed directly to your incident coordinates without delay.</span>
          </div>

          <div className="space-y-1">
            <strong className="text-white block">Phone Dialer:</strong>
            <span>Allows direct communication with your assigned ambulance driver and hospital receiving desk.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
