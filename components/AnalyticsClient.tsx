"use client";

import { useMemo, useState } from "react";
import type { EmergencyRequest, Hospital, Driver } from "@/lib/types";
import { parsePatientReview } from "@/lib/patientReview";

interface AnalyticsClientProps {
  requests: EmergencyRequest[];
  hospitals: Hospital[];
  drivers: Driver[];
}

export function AnalyticsClient({ requests, hospitals, drivers }: AnalyticsClientProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("30d");

  // 1. Time Range Filtered Requests
  const filteredRequests = useMemo(() => {
    if (timeRange === "all") return requests;
    const now = Date.now();
    const days = timeRange === "7d" ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return requests.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }, [requests, timeRange]);

  // 2. High-Level KPI Calculations
  const metrics = useMemo(() => {
    const total = filteredRequests.length;
    const completed = filteredRequests.filter((r) => r.status.toLowerCase().includes("complete"));
    const cancelled = filteredRequests.filter((r) =>
      r.status.toLowerCase().includes("cancel") || r.status.toLowerCase().includes("fail")
    );
    const active = total - completed.length - cancelled.length;

    // Response Times (Created -> Completed)
    const durations = completed
      .filter((r) => r.completed_at)
      .map((r) => (new Date(r.completed_at!).getTime() - new Date(r.created_at).getTime()) / 60000)
      .filter((m) => m > 0 && m < 300); // Filter anomalous data

    const avgResponseTime = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    // Quality of Service / Ratings
    const reviews = filteredRequests
      .map((r) => parsePatientReview(r.notes))
      .filter((rev): rev is NonNullable<typeof rev> => rev !== null);

    const avgRating = reviews.length
      ? Number((reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1))
      : null;

    const fiveStarRate = reviews.length
      ? Math.round((reviews.filter((r) => r.rating === 5).length / reviews.length) * 100)
      : null;

    // Fleet Stats
    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter((d) => d.active).length;

    // Hospital Capacity
    const totalBeds = hospitals.reduce((sum, h) => sum + (h.available_capacity ?? 0), 0);

    return {
      total,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      activeCount: active,
      completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
      avgResponseTime,
      reviewsCount: reviews.length,
      avgRating,
      fiveStarRate,
      totalDrivers,
      activeDrivers,
      totalBeds,
    };
  }, [filteredRequests, drivers, hospitals]);

  // 3. Category Breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRequests) {
      const type = r.emergency_type || "General Emergency";
      map.set(type, (map.get(type) ?? 0) + 1);
    }
    const total = filteredRequests.length || 1;
    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRequests]);

  // 4. Status Breakdown
  const statusStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRequests) {
      map.set(r.status, (map.get(r.status) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredRequests]);

  // 5. Hospital Distribution
  const hospitalStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; capacity: number | null }>();
    for (const h of hospitals) {
      map.set(h.id, { name: h.name, count: 0, capacity: h.available_capacity });
    }
    for (const r of filteredRequests) {
      if (r.hospital_id && map.has(r.hospital_id)) {
        map.get(r.hospital_id)!.count += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredRequests, hospitals]);

  // 6. 7-Day Trend
  const dailyTrend = useMemo(() => {
    const days: { dateStr: string; label: string; count: number; completed: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
      
      const dayRequests = filteredRequests.filter(
        (r) => r.created_at.startsWith(dateKey)
      );
      const dayCompleted = dayRequests.filter((r) =>
        r.status.toLowerCase().includes("complete")
      ).length;

      days.push({
        dateStr: dateKey,
        label: dayLabel,
        count: dayRequests.length,
        completed: dayCompleted,
      });
    }
    const maxCount = Math.max(...days.map((d) => d.count), 1);
    return { days, maxCount };
  }, [filteredRequests]);

  return (
    <div className="space-y-6">
      {/* ── TOOLBAR / RANGE FILTER ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-bold">
            Executive Command Suite
          </div>
          <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight">
            EMS Performance & Operations Intelligence
          </h2>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
          {(
            [
              { key: "7d", label: "Past 7 Days" },
              { key: "30d", label: "Past 30 Days" },
              { key: "all", label: "Lifetime All-Time" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTimeRange(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === t.key
                  ? "bg-sky-500 text-white shadow-md ring-1 ring-sky-400"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── EXECUTIVE KPI METRICS (GRID 1) ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dispatches */}
        <div className="p-4 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-[var(--surface)] to-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
            <span>Total Dispatches</span>
            <span className="text-base">🚨</span>
          </div>
          <div className="mt-2 text-3xl font-black text-sky-600 dark:text-sky-400">
            {metrics.total}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Active in queue: {metrics.activeCount}</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              {metrics.completionRate}% resolved
            </span>
          </div>
        </div>

        {/* Avg Response Duration */}
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-[var(--surface)] to-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <span>Avg. Turnaround Time</span>
            <span className="text-base">⏱️</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
              {metrics.avgResponseTime != null ? metrics.avgResponseTime : "—"}
            </span>
            <span className="text-xs text-[var(--muted)] font-bold">minutes</span>
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Requested → Patient Intake admission
          </div>
        </div>

        {/* Patient Satisfaction Index */}
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-[var(--surface)] to-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <span>Patient Care Rating</span>
            <span className="text-base">⭐</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-amber-700 dark:text-amber-400">
              {metrics.avgRating != null ? metrics.avgRating.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-[var(--muted)] font-bold">/ 5.0</span>
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {metrics.fiveStarRate != null ? `${metrics.fiveStarRate}% 5-star ratings` : "No ratings in period"}
          </div>
        </div>

        {/* Fleet Deployment */}
        <div className="p-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-[var(--surface)] to-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
            <span>Fleet & Facility Readiness</span>
            <span className="text-base">🚑</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-700 dark:text-indigo-400">
              {metrics.activeDrivers} / {metrics.totalDrivers}
            </span>
            <span className="text-xs text-[var(--muted)] font-bold">units ready</span>
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {metrics.totalBeds} verified triage ER beds open
          </div>
        </div>
      </div>

      {/* ── 7-DAY DISPATCH VOLUME VISUALIZER (BAR CHART) ───────────────────── */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Daily Dispatch Volume & Intake Flow
            </div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              7-Day Run Activity Timeline
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded bg-sky-500 inline-block" /> Total Calls
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Completed
            </span>
          </div>
        </div>

        {/* Bar Visualizer */}
        <div className="grid grid-cols-7 gap-2 pt-4 items-end min-h-[160px] border-b border-[var(--border)] pb-3">
          {dailyTrend.days.map((day) => {
            const heightPercent = Math.max(Math.round((day.count / dailyTrend.maxCount) * 100), 8);
            const completedPercent = day.count > 0 ? Math.round((day.completed / day.count) * 100) : 0;

            return (
              <div key={day.dateStr} className="flex flex-col items-center gap-2 group">
                <span className="text-[11px] font-black font-mono text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.count}
                </span>
                <div className="w-full max-w-[42px] bg-[var(--surface-raised)] rounded-t-lg overflow-hidden flex flex-col justify-end relative h-28 border border-[var(--border)]">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-sky-500 rounded-t-sm transition-all relative flex flex-col justify-end"
                  >
                    <div
                      style={{ height: `${completedPercent}%` }}
                      className="w-full bg-emerald-500/90 transition-all"
                    />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[var(--muted)] text-center">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TWO-COLUMN BREAKDOWN: TRIAGE SPECTRUM & HOSPITAL INTAKE ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Triage / Emergency Categories */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Clinical Distribution
            </div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Triage Category Spectrum
            </h3>
          </div>

          <div className="space-y-3">
            {categoryStats.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-6 text-center">No runs logged in this period.</p>
            ) : (
              categoryStats.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--foreground)]">{cat.name}</span>
                    <span className="font-mono text-[var(--muted)]">
                      {cat.count} runs ({cat.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden border border-[var(--border)]">
                    <div
                      style={{ width: `${cat.percent}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hospital Intake Routing */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Receiving Network Bay
            </div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Hospital Admission & Intake Volume
            </h3>
          </div>

          <div className="space-y-3">
            {hospitalStats.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-6 text-center">No hospitals registered yet.</p>
            ) : (
              hospitalStats.map((h) => (
                <div
                  key={h.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-[var(--foreground)]">{h.name}</div>
                    <div className="text-[10px] text-[var(--muted)]">
                      {h.capacity != null ? `${h.capacity} open trauma beds` : "Capacity untracked"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black font-mono text-sm text-sky-700 dark:text-sky-400">
                      {h.count}
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">received runs</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── DISPATCH STATUS WORKFLOW MATRIX ───────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Lifecycle Matrix
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)]">
            Dispatch Queue Status State Distribution
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {statusStats.map(([status, count]) => (
            <div
              key={status}
              className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-center space-y-1"
            >
              <div className="text-[10px] font-bold text-[var(--muted)] truncate uppercase tracking-wider">
                {status}
              </div>
              <div className="text-xl font-black text-[var(--foreground)] font-mono">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
