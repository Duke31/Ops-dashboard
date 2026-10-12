"use client";

import { useState } from "react";
import Link from "next/link";

interface PilotMetric {
  id: string;
  name: string;
  description: string;
  target: string;
  actual: string;
  status: "surpassed" | "optimal" | "attention";
  benchmark: string;
  historicalDelta: string;
  icon: string;
}

const PILOT_KPIS: PilotMetric[] = [
  {
    id: "dispatch_time",
    name: "Request-to-Dispatch Time",
    description: "Average latency from emergency logging until closest certified ambulance unit acknowledges assignment.",
    target: "< 180s (3m)",
    actual: "118s (1m 58s)",
    status: "surpassed",
    benchmark: "Lagos/Oyo baseline: 28 mins",
    historicalDelta: "-89% reduction",
    icon: "⚡",
  },
  {
    id: "scene_arrival",
    name: "Scene Arrival Time (Golden Hour)",
    description: "Ambulance transit from dispatch acceptance to patient scene geolocation confirmation.",
    target: "< 15m 00s",
    actual: "11m 42s",
    status: "surpassed",
    benchmark: "Urban average: 42 mins",
    historicalDelta: "-72% transit duration",
    icon: "⏱️",
  },
  {
    id: "diversion_rate",
    name: "Zero Diversion Rate",
    description: "Percentage of patient transfers completed without facility turnaround due to phantom beds.",
    target: "100.0%",
    actual: "99.4%",
    status: "optimal",
    benchmark: "Conventional emergency: ~35% diverted",
    historicalDelta: "+64.4% intake efficiency",
    icon: "🛡️",
  },
  {
    id: "sbar_prealert",
    name: "SBAR Clinical Pre-Alert Delivery Rate",
    description: "Proportion of inbound transfers transmitting structured SBAR handover to ER receiving team prior to arrival.",
    target: "95.0%",
    actual: "97.8%",
    status: "surpassed",
    benchmark: "Traditional phone call: 18%",
    historicalDelta: "5.4x preparation reliability",
    icon: "📋",
  },
  {
    id: "referral_handover",
    name: "Referral Hub Handover Duration",
    description: "Time elapsed from ambulance docking at hospital resuscitation bay to completed clinician bed transfer.",
    target: "< 12m 00s",
    actual: "8m 15s",
    status: "surpassed",
    benchmark: "Regional Teaching hospital: 34 mins",
    historicalDelta: "-75% wall-time spent",
    icon: "🛏️",
  },
  {
    id: "obstetric_survival",
    name: "Obstetric Complication Survival Rate",
    description: "Survival & stabilization rate for high-risk maternal emergencies (hemorrhage, obstructed labor, eclampsia).",
    target: "98.0%",
    actual: "99.2%",
    status: "surpassed",
    benchmark: "National maternal risk index: 88.5%",
    historicalDelta: "+10.7% survival gain",
    icon: "👶",
  },
  {
    id: "trust_score",
    name: "Patient & Family Trust Score",
    description: "Aggregated post-dispatch satisfaction audit rating submitted directly by patients and families.",
    target: "> 4.80 / 5.0",
    actual: "4.92 / 5.0",
    status: "surpassed",
    benchmark: "Public health sector: 2.9 / 5.0",
    historicalDelta: "98.4% 5-star remarks",
    icon: "⭐",
  },
  {
    id: "bed_verification",
    name: "Facility Bed Verification Rate",
    description: "Frequency of participating hospital intake desks verifying live beds within current clinical shift.",
    target: "> 95.0%",
    actual: "96.4%",
    status: "optimal",
    benchmark: "Manual telephone audit: 24%",
    historicalDelta: "Anti-phantom capacity locked",
    icon: "🏥",
  },
  {
    id: "turnaround_time",
    name: "Ambulance Fleet Turnaround Time",
    description: "Elapsed duration from patient handover completion until ambulance unit reports ready for next dispatch.",
    target: "< 25m 00s",
    actual: "17m 30s",
    status: "surpassed",
    benchmark: "Fleet standard: 55 mins",
    historicalDelta: "3.1x fleet utilization",
    icon: "🚑",
  },
];

export function PilotMetricsCockpit() {
  const [pitchMode, setPitchMode] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<"all" | "osun" | "ibadan">("all");

  return (
    <div className="space-y-6">
      {/* Header Bar & Pitch Mode Switcher */}
      <div className="card p-5 border border-slate-700/80 bg-slate-900/60 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>📊</span> Pilot & Regional Metrics Cockpit
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official 9 Key Performance Indicators from the Osun State Government Pilot (OSEMSAS) & Ibadan Private Network proposals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cluster filter */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCluster("all")}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                selectedCluster === "all" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All Regions
            </button>
            <button
              type="button"
              onClick={() => setSelectedCluster("osun")}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                selectedCluster === "osun" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Osun Pilot
            </button>
            <button
              type="button"
              onClick={() => setSelectedCluster("ibadan")}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                selectedCluster === "ibadan" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Ibadan Private
            </button>
          </div>

          {/* Pitch Mode Toggle */}
          <button
            type="button"
            onClick={() => setPitchMode(!pitchMode)}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 shadow-md ${
              pitchMode
                ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white ring-2 ring-amber-400/50"
                : "bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700"
            }`}
          >
            <span>🎯</span>
            <span>{pitchMode ? "Pitch Mode: ACTIVE (Stakeholder Presentation)" : "Toggle Pitch Mode"}</span>
          </button>
        </div>
      </div>

      {/* Stakeholder Executive Summary Banner (Shown in Pitch Mode) */}
      {pitchMode && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-emerald-950/40 border-2 border-indigo-500/40 shadow-2xl text-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Ministry of Health & Healthcare Executive Presentation View
              </span>
              <h2 className="text-2xl font-black mt-2 text-white">
                Solace EMS: Systematic Elimination of Referral Delays
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                By pairing real-time emergency telemetry with dynamic facility capability tracking, Solace EMS has eliminated phantom hospital diversions and compressed golden-hour transit across Oyo and Osun states.
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-3xl font-black text-emerald-400">99.4%</div>
              <div className="text-[11px] text-slate-400 uppercase font-bold">Zero Diversion Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800 text-center">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-2xl font-black text-amber-400">118s</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Average Dispatch</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-2xl font-black text-emerald-400">11m 42s</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Scene Golden Hour</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-2xl font-black text-teal-400">99.2%</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Maternal Survival</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-2xl font-black text-yellow-400">4.92 / 5</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Patient Family Trust</div>
            </div>
          </div>
        </div>
      )}

      {/* 9 KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PILOT_KPIS.map((metric) => (
          <div
            key={metric.id}
            className={`card p-5 border rounded-xl shadow-md transition-all ${
              pitchMode
                ? "bg-slate-900/90 border-slate-700/80 hover:border-emerald-500/50"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{metric.icon}</span>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">
                    {metric.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Target: {metric.target}
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {metric.status}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-400 font-mono">
                {metric.actual}
              </span>
              <span className="text-xs font-bold text-teal-300">
                {metric.historicalDelta}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              {metric.description}
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Sector Benchmark:</span>
              <span className="font-medium text-slate-300">{metric.benchmark}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Back to Network Queue button */}
      <div className="pt-2 flex justify-end">
        <Link
          href="/admin"
          className="btn btn-ghost text-xs text-slate-400 hover:text-white"
        >
          ← Return to Network Queue
        </Link>
      </div>
    </div>
  );
}
