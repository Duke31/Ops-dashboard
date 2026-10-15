"use client";

import { useState, useMemo } from "react";
import type { EmergencyRequest } from "@/lib/types";
import { parsePatientReview } from "@/lib/patientReview";
import {
  Star,
  MessageSquareQuote,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  X,
  User,
  Building2,
  MapPin,
  Phone,
  Tag,
  Calendar,
} from "lucide-react";

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
      {/* 1. SOLID KPI CARDS (NO FADING PASTEL WASHES OR MUDDY GRADIENTS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Rating */}
        <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs hover:border-[var(--border-strong)] transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
            <span className="uppercase tracking-wider text-[11px]">Overall Patient Rating</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--foreground)] tracking-tight">
              {stats.total > 0 ? stats.avg.toFixed(1) : "-"}
            </span>
            <span className="text-xs text-[var(--muted)] font-semibold">/ 5.0</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(stats.avg)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-slate-300 dark:text-slate-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-[var(--muted)]">
              {stats.total > 0 ? `(${stats.total} ratings)` : "No reviews yet"}
            </span>
          </div>
        </div>

        {/* Feedback Count */}
        <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs hover:border-[var(--border-strong)] transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
            <span className="uppercase tracking-wider text-[11px]">Total Feedback Logged</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <MessageSquareQuote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-[var(--foreground)] tracking-tight">
            {stats.total}
          </div>
          <div className="mt-2 text-xs text-[var(--muted)] font-medium">
            Verified patient post-dispatch reviews
          </div>
        </div>

        {/* 5-Star Excellence */}
        <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs hover:border-[var(--border-strong)] transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
            <span className="uppercase tracking-wider text-[11px]">5-Star Exceptional Runs</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {stats.fiveStars}
            </span>
            {stats.total > 0 && (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                ({Math.round((stats.fiveStars / stats.total) * 100)}%)
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-[var(--muted)] font-medium">
            Flawless paramedic & clinical handovers
          </div>
        </div>

        {/* Attention / Follow-up */}
        <div className="card rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs hover:border-[var(--border-strong)] transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
            <span className="uppercase tracking-wider text-[11px]">Attention Required (&le; 3)</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {stats.threeOrLess}
          </div>
          <div className="mt-2 text-xs text-[var(--muted)] font-medium">
            Flagged for triage & dispatch audit
          </div>
        </div>
      </div>

      {/* 2. UNIFIED FILTER & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-[var(--muted)] mr-1">Filter by Score:</span>
          {(
            [
              { id: "all", label: "All Reviews" },
              { id: 5, label: "5 Stars" },
              { id: 4, label: "4 Stars" },
              { id: 3, label: "3 & Below" },
            ] as const
          ).map((tab) => {
            const isActive = filterRating === tab.id;
            return (
              <button
                key={String(tab.id)}
                type="button"
                onClick={() => setFilterRating(tab.id as number | "all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-xs"
                    : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[260px] max-w-sm flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search remarks, triage, paramedic, hospital..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-8 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. REVIEWS GRID */}
      {filtered.length === 0 ? (
        <div className="card rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] mx-auto mb-3">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[var(--foreground)]">No Patient Reviews Found</h4>
          <p className="mt-1 text-xs text-[var(--muted)] max-w-md mx-auto leading-relaxed">
            {reviewedItems.length === 0
              ? "When patients submit a rating and remark upon incident completion from their mobile app, verified feedback will appear here live across all desks."
              : "No reviews match your current filter or search criteria. Try clearing the search term or switching filter score."}
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

            // Score-tier border accent (high contrast, non-conflicting)
            const borderAccent =
              review.rating === 5
                ? "border-l-4 border-l-emerald-500"
                : review.rating === 4
                ? "border-l-4 border-l-teal-500"
                : review.rating === 3
                ? "border-l-4 border-l-amber-500"
                : "border-l-4 border-l-rose-500";

            return (
              <div
                key={r.id}
                className={`card rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs hover:border-[var(--border-strong)] transition-all flex flex-col justify-between ${borderAccent}`}
              >
                <div>
                  {/* Top: Stars, ID, Date & Tier Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= review.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-transparent text-slate-300 dark:text-slate-700"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-xs font-black text-[var(--foreground)]">
                          {review.rating}.0
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                        <span className="font-mono font-bold text-[var(--foreground)]">
                          Ref #{shortId}
                        </span>
                        <span>•</span>
                        <span>{r.emergency_type || "Emergency Dispatch"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[var(--muted)]" />
                          {dateStr}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        review.rating === 5
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                          : review.rating === 4
                          ? "bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25"
                          : review.rating === 3
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25"
                      }`}
                    >
                      {review.rating === 5
                        ? "Exceptional Care"
                        : review.rating === 4
                        ? "Great Care"
                        : review.rating === 3
                        ? "Standard"
                        : "Review Required"}
                    </span>
                  </div>

                  {/* Patient Remark Quote Box - Clean neutral background, no conflicting yellow box */}
                  <div className="my-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-[var(--muted)]" />
                      <span>Verified Patient Experience:</span>
                    </div>
                    <p className="text-xs text-[var(--foreground)] font-medium leading-relaxed italic">
                      &ldquo;{review.remark}&rdquo;
                    </p>
                  </div>

                  {/* Patient Impression Tags - Neutral chips with clean icons */}
                  {review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {review.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--surface-raised)] text-[var(--foreground)] border border-[var(--border)]"
                        >
                          <Tag className="w-2.5 h-2.5 text-[var(--muted)]" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer: Responders Involved with clean metadata icons */}
                <div className="border-t border-[var(--border)] pt-2.5 text-[11px] text-[var(--muted)] space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                      <span className="text-[var(--foreground)] font-semibold truncate">
                        {r.driver?.display_name || "Paramedic Unit"}
                      </span>
                      {r.driver?.vehicle_label && (
                        <span className="font-mono text-[10px] text-[var(--muted)]">
                          ({r.driver.vehicle_label})
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                      <span className="text-[var(--foreground)] font-semibold truncate">
                        {r.hospital?.name || "Regional Facility"}
                      </span>
                    </span>
                  </div>

                  {r.patient_address && (
                    <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[var(--muted)] shrink-0" />
                        <span className="truncate">{r.patient_address}</span>
                      </span>
                      {r.contact_phone && (
                        <span className="flex items-center gap-1 shrink-0 font-mono">
                          <Phone className="w-3 h-3 text-[var(--muted)] shrink-0" />
                          <span>{r.contact_phone}</span>
                        </span>
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
