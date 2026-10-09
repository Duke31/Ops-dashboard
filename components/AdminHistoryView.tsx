"use client";

import { useState, useMemo } from "react";
import type { EmergencyRequest } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatLocation } from "@/lib/queries";
import { formatDateTime, timeSince } from "@/lib/format";
import { getCleanMedicalNotes, parsePatientReview } from "@/lib/patientReview";

export function AdminHistoryView({
  requests,
}: {
  requests: EmergencyRequest[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [hospitalFilter, setHospitalFilter] = useState<string>("all");

  // Derive unique values for filters
  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.emergency_type) set.add(r.emergency_type);
    });
    return Array.from(set).sort();
  }, [requests]);

  const uniqueHospitals = useMemo(() => {
    const map = new Map<string, string>();
    requests.forEach((r) => {
      if (r.hospital?.id && r.hospital?.name) {
        map.set(r.hospital.id, r.hospital.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [requests]);

  const stats = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter((r) =>
      r.status.toLowerCase().includes("complete"),
    ).length;
    const cancelled = requests.filter(
      (r) =>
        r.status.toLowerCase().includes("cancel") ||
        r.status.toLowerCase().includes("fail"),
    ).length;
    const active = total - completed - cancelled;
    return { total, completed, cancelled, active };
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "completed" && !r.status.toLowerCase().includes("complete")) {
          return false;
        }
        if (
          statusFilter === "cancelled" &&
          !r.status.toLowerCase().includes("cancel") &&
          !r.status.toLowerCase().includes("fail")
        ) {
          return false;
        }
        if (
          statusFilter === "active" &&
          (r.status.toLowerCase().includes("complete") ||
            r.status.toLowerCase().includes("cancel") ||
            r.status.toLowerCase().includes("fail"))
        ) {
          return false;
        }
      }

      // Emergency type filter
      if (typeFilter !== "all" && r.emergency_type !== typeFilter) {
        return false;
      }

      // Hospital filter
      if (hospitalFilter !== "all" && r.hospital?.id !== hospitalFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const loc = formatLocation(r).toLowerCase();
        const id = r.id.toLowerCase();
        const type = (r.emergency_type || "").toLowerCase();
        const hospitalName = (r.hospital?.name || "").toLowerCase();
        const driverName = (r.driver?.display_name || "").toLowerCase();
        const phone = (r.contact_phone || "").toLowerCase();
        const notes = (r.notes || "").toLowerCase();
        const ageBand = (r.patient_age_band || "").toLowerCase();

        return (
          loc.includes(term) ||
          id.includes(term) ||
          type.includes(term) ||
          hospitalName.includes(term) ||
          driverName.includes(term) ||
          phone.includes(term) ||
          notes.includes(term) ||
          ageBand.includes(term)
        );
      }

      return true;
    });
  }, [requests, statusFilter, typeFilter, hospitalFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="card p-3.5 border-l-4 border-l-blue-500">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Total Handled
          </div>
          <div className="text-2xl font-black mt-1 text-[var(--foreground)]">
            {stats.total}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">
            Lifetime emergency tickets
          </div>
        </div>

        <div className="card p-3.5 border-l-4 border-l-emerald-500">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Completed / Admitted
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.completed}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">
            Successful dispatches
          </div>
        </div>

        <div className="card p-3.5 border-l-4 border-l-rose-500">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Cancelled / Aborted
          </div>
          <div className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-400">
            {stats.cancelled}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">
            Cancelled or failed requests
          </div>
        </div>

        <div className="card p-3.5 border-l-4 border-l-amber-500">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Currently In Flight
          </div>
          <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
            {stats.active}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">
            Active in operational queue
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by ID, location, phone, driver, hospital, notes, age..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full text-xs py-2 pl-8"
            />
            <span className="absolute left-2.5 top-2.5 text-xs text-[var(--muted)]">
              🔍
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select text-xs py-1.5 px-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-md text-[var(--foreground)]"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed only</option>
              <option value="cancelled">Cancelled / Failed</option>
              <option value="active">Active only</option>
            </select>

            {/* Type Select */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="select text-xs py-1.5 px-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-md text-[var(--foreground)]"
            >
              <option value="all">All Categories</option>
              {uniqueTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Hospital Select */}
            {uniqueHospitals.length > 0 && (
              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="select text-xs py-1.5 px-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-md text-[var(--foreground)]"
              >
                <option value="all">All Hospitals</option>
                {uniqueHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            )}

            {(searchTerm || statusFilter !== "all" || typeFilter !== "all" || hospitalFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setHospitalFilter("all");
                }}
                className="btn btn-ghost text-xs px-2.5 py-1 text-rose-500 hover:text-rose-600"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--muted)] pt-1">
          <span>
            Showing <strong className="text-[var(--foreground)]">{filtered.length}</strong> of{" "}
            {requests.length} records
          </span>
        </div>
      </div>

      {/* History Data Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-sm text-[var(--muted)]">
          <p className="text-base font-semibold text-[var(--foreground)] mb-1">
            No matching requests found
          </p>
          <p className="text-xs">
            Try adjusting your search query, filter criteria, or click Reset.
          </p>
        </div>
      ) : (
        <div className="table-wrap card overflow-hidden">
          <table className="data w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
                <th className="py-3 px-3 font-bold">Ticket & Patient Location</th>
                <th className="py-3 px-3 font-bold">Triage & Age</th>
                <th className="py-3 px-3 font-bold">Status</th>
                <th className="py-3 px-3 font-bold">Assigned Hospital</th>
                <th className="py-3 px-3 font-bold">Driver / Unit</th>
                <th className="py-3 px-3 font-bold">Timing</th>
                <th className="py-3 px-3 font-bold">Review / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs text-[var(--foreground)]">
              {filtered.map((r) => {
                const cleanNotes = getCleanMedicalNotes(r.notes);
                const review = parsePatientReview(r.notes);
                const locationStr = formatLocation(r);

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-[var(--surface-raised)] transition-colors"
                  >
                    {/* Location & Ticket ID */}
                    <td className="py-3 px-3 align-top max-w-[240px]">
                      <div className="font-semibold text-sm truncate" title={locationStr}>
                        {locationStr}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--muted)] mt-0.5 truncate">
                        ID: {r.id.substring(0, 8)}…
                      </div>
                      {r.contact_phone && (
                        <div className="text-[11px] text-[var(--muted)] mt-1 flex items-center gap-1">
                          <span>📞</span>
                          <span className="font-mono">{r.contact_phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Triage & Patient Info */}
                    <td className="py-3 px-3 align-top whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--surface-raised)] border border-[var(--border)]">
                        {r.emergency_type || "General"}
                      </span>
                      {r.patient_age_band && (
                        <div className="text-[11px] text-[var(--muted)] mt-1">
                          {r.patient_age_band === "unknown"
                            ? "Age: Not specified"
                            : `Age: ${r.patient_age_band} yrs`}
                        </div>
                      )}
                      {r.priority != null && (
                        <div className="text-[10px] text-[var(--muted)] mt-0.5">
                          Priority {r.priority}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 align-top whitespace-nowrap">
                      <StatusBadge status={r.status} />
                    </td>

                    {/* Hospital */}
                    <td className="py-3 px-3 align-top">
                      {r.hospital ? (
                        <div>
                          <div className="font-semibold text-[13px]">
                            {r.hospital.name}
                          </div>
                          {r.hospital.address && (
                            <div className="text-[11px] text-[var(--muted)] truncate max-w-[180px]" title={r.hospital.address}>
                              {r.hospital.address}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)] italic text-[11px]">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Driver */}
                    <td className="py-3 px-3 align-top">
                      {r.driver ? (
                        <div>
                          <div className="font-semibold text-[13px]">
                            {r.driver.display_name}
                          </div>
                          {r.driver.vehicle_label && (
                            <div className="text-[11px] text-[var(--muted)]">
                              🚑 {r.driver.vehicle_label}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)] italic text-[11px]">
                          No driver assigned
                        </span>
                      )}
                    </td>

                    {/* Timing */}
                    <td className="py-3 px-3 align-top whitespace-nowrap text-[11px]">
                      <div title={formatDateTime(r.created_at)}>
                        Created: <span className="font-medium">{timeSince(r.created_at)} ago</span>
                      </div>
                      {r.completed_at && (
                        <div
                          className="text-emerald-600 dark:text-emerald-400 mt-1"
                          title={formatDateTime(r.completed_at)}
                        >
                          Closed: {formatDateTime(r.completed_at)}
                        </div>
                      )}
                      <div className="text-[10px] text-[var(--muted)] mt-0.5">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Review or Notes */}
                    <td className="py-3 px-3 align-top max-w-[200px]">
                      {review ? (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded p-1.5 text-[11px]">
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            <span>{"⭐".repeat(review.rating)}</span>
                            <span>({review.rating}/5)</span>
                          </div>
                          {review.remark && (
                            <p className="italic text-[10px] text-[var(--foreground)] mt-0.5 line-clamp-2" title={review.remark}>
                              "{review.remark}"
                            </p>
                          )}
                        </div>
                      ) : cleanNotes ? (
                        <p className="text-[11px] text-[var(--muted)] line-clamp-2" title={cleanNotes}>
                          {cleanNotes}
                        </p>
                      ) : (
                        <span className="text-[var(--muted)] italic text-[10px]">
                          None
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
