"use client";

import { useState, useMemo } from "react";
import type { EmergencyRequest } from "@/lib/types";
import { parsePatientReview } from "@/lib/patientReview";

export function PatientReviewsView({
  requests,
  role,
}: {
  requests: EmergencyRequest[];
  role: "admin" | "dispatcher";
}) {
  const [filterRating, setFilterRating] = useState<number | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const reviewedItems = useMemo(() => {
    return requests
      .map((r) => {
        const review = parsePatientReview(r.notes);
        return review ? { request: r, review } : null;
      })
      .filter((item): item is { request: EmergencyRequest; review: NonNullable<ReturnType<typeof parsePatientReview>> } => item !== null);
  }, [requests]);

  const stats = useMemo(() => {
    if (!reviewedItems.length) {
      return { avg: 0, total: 0, fiveStars: 0, fourStars: 0, threeOrLess: 0 };
    }
    const sum = reviewedItems.reduce((acc, curr) => acc + curr.review.rating, 0);
    const five = reviewedItems.filter((i) => i.review.rating === 5).length;
    const four = reviewedItems.filter((i) => i.review.rating === 4).length;
    const threeLess = reviewedItems.filter((i) => i.review.rating <= 3).length;
    return {
      avg: Number((sum / reviewedItems.length).toFixed(1)),
      total: reviewedItems.length,
      fiveStars: five,
      fourStars: four,
      threeOrLess: threeLess,
    };
  }, [reviewedItems]);

  const filtered = useMemo(() => {
    return reviewedItems.filter((item) => {
      if (filterRating !== "all" && item.review.rating !== filterRating) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesRemark = item.review.remark.toLowerCase().includes(term);
        const matchesType = item.request.emergency_type?.toLowerCase().includes(term);
        const matchesHospital = item.request.hospital?.name?.toLowerCase().includes(term);
        const matchesDriver = item.request.driver?.display_name?.toLowerCase().includes(term);
        const matchesTag = item.review.tags.some((t) => t.toLowerCase().includes(term));
        const matchesId = item.request.id.toLowerCase().includes(term);
        return matchesRemark || matchesType || matchesHospital || matchesDriver || matchesTag || matchesId;
      }
      return true;
    });
  }, [reviewedItems, filterRating, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Rating */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-gradient-to-br dark:from-amber-950/30 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold uppercase tracking-wider">
            <span>Overall Patient Rating</span>
            <span className="text-base">⭐</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.total > 0 ? stats.avg.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-[var(--muted)]">/ 5.0</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-semibold">
            {stats.total > 0
              ? "★".repeat(Math.round(stats.avg)) + "☆".repeat(5 - Math.round(stats.avg))
              : "No ratings logged yet"}
          </div>
        </div>

        {/* Total Reviews Logged */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-50/50 dark:bg-gradient-to-br dark:from-sky-950/30 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-400 font-semibold uppercase tracking-wider">
            <span>Patient Feedback Count</span>
            <span className="text-base">📝</span>
          </div>
          <div className="mt-2 text-3xl font-black text-sky-600 dark:text-sky-400">{stats.total}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">Verified patient reviews & remarks</div>
        </div>

        {/* 5-Star Excellence Ratio */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-gradient-to-br dark:from-emerald-950/30 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">
            <span>5-Star Exceptional Runs</span>
            <span className="text-base">🏅</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.fiveStars}</span>
            {stats.total > 0 && (
              <span className="text-xs text-emerald-700 dark:text-emerald-400/80 font-medium">
                ({Math.round((stats.fiveStars / stats.total) * 100)}%)
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">Top-tier paramedic & hospital performance</div>
        </div>

        {/* Attention / Follow-up */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-gradient-to-br dark:from-rose-950/30 dark:to-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-semibold uppercase tracking-wider">
            <span>Follow-up Remarks (&le; 3★)</span>
            <span className="text-base">⚠️</span>
          </div>
          <div className="mt-2 text-3xl font-black text-rose-600 dark:text-rose-400">{stats.threeOrLess}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">Runs requiring dispatch QA review</div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--muted)] mr-1">Filter by Score:</span>
          {(["all", 5, 4, 3] as const).map((score) => {
            const isActive = filterRating === score;
            const label = score === "all" ? "All Reviews" : `${score} Stars ${"★".repeat(score)}`;
            return (
              <button
                key={score}
                type="button"
                onClick={() => setFilterRating(score)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400"
                    : "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px] max-w-sm flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search remarks, triage, driver, hospital..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-amber-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. REVIEWS GRID / LIST */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <div className="text-4xl mb-3">💬</div>
          <h4 className="text-base font-bold text-[var(--foreground)]">No Patient Reviews Found</h4>
          <p className="mt-1 text-xs text-[var(--muted)] max-w-md mx-auto">
            {reviewedItems.length === 0
              ? "When patients submit a rating and remark from the mobile app's History & Review section, they will appear here live with paramedic and triage audit details."
              : "No reviews match your current filter or search criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(({ request: r, review }) => {
            const shortId = r.id.substring(0, 8).toUpperCase();
            const dateStr = new Date(r.created_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={r.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm hover:border-[var(--accent)] dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: Stars, ID, Date */}
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg leading-none font-black text-amber-500 dark:text-amber-400">
                          {"★".repeat(review.rating)}
                          <span className="text-slate-300 dark:text-slate-600">{"☆".repeat(5 - review.rating)}</span>
                        </span>
                        <span className="ml-1 text-xs font-black text-amber-700 dark:text-amber-300">
                          {review.rating}.0 / 5.0
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                        <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">Ref #{shortId}</span>
                        <span>•</span>
                        <span>{r.emergency_type || "Emergency"}</span>
                        <span>•</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        review.rating >= 4
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                          : review.rating === 3
                          ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {review.rating === 5
                        ? "Exceptional"
                        : review.rating === 4
                        ? "Great Care"
                        : review.rating === 3
                        ? "Acceptable"
                        : "Requires Review"}
                    </span>
                  </div>

                  {/* Patient Remark Quote Box */}
                  <div className="my-3 rounded-lg bg-amber-500/10 border border-amber-500/25 p-3">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
                      <span>💬</span>
                      <span>Patient Remark & Experience:</span>
                    </div>
                    <p className="text-xs text-amber-950 dark:text-amber-100 font-medium leading-relaxed italic">
                      &ldquo;{review.remark}&rdquo;
                    </p>
                  </div>

                  {/* Patient Impression Tags */}
                  {review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {review.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--surface-raised)] text-sky-800 dark:text-sky-300 border border-[var(--border)]"
                        >
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer: Responders Involved */}
                <div className="border-t border-[var(--border)] pt-2.5 text-[11px] text-[var(--muted)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>🚑</span>
                      <span className="text-[var(--foreground)] font-medium">
                        {r.driver?.display_name || "Paramedic Unit"}{" "}
                        {r.driver?.vehicle_label && (
                          <span className="font-mono text-[10px] text-[var(--muted)]">
                            ({r.driver.vehicle_label})
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>🏥</span>
                      <span className="text-[var(--foreground)] font-medium">
                        {r.hospital?.name || "Regional Trauma Bay"}
                      </span>
                    </span>
                  </div>

                  {r.patient_address && (
                    <div className="flex items-center gap-1.5 truncate text-[10px] text-[var(--muted)]">
                      <span>📍</span>
                      <span className="truncate">{r.patient_address}</span>
                      {r.contact_phone && (
                        <>
                          <span>•</span>
                          <span>📞 {r.contact_phone}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
