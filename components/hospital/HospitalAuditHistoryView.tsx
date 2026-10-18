"use client";

import { useEffect, useMemo, useState } from "react";
import type { EmergencyRequest } from "@/lib/types";
import { formatLocation, resolvePatientAgeBand } from "@/lib/queries";
import { formatDateTime, timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { getCleanMedicalNotes, parsePatientReview } from "@/lib/patientReview";
import {
  Download,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  MapPin,
  X,
  Star,
  ShieldCheck,
  Clock,
  Activity,
  BedDouble,
  User,
} from "lucide-react";

interface ParsedHospitalNotes {
  admittedBay: string | null;
  clinicalHandover: string | null;
  auditEvents: string[];
}

function parseHospitalAdmissionDetails(notes: string | null | undefined): ParsedHospitalNotes {
  if (!notes) {
    return { admittedBay: null, clinicalHandover: null, auditEvents: [] };
  }

  let admittedBay: string | null = null;
  let clinicalHandover: string | null = null;
  const auditEvents: string[] = [];

  const lines = notes.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bayMatch = trimmed.match(/\[(?:ADMITTED TO|ADMITTED|BAY|BED):\s*([^\]]+)\]/i);
    if (bayMatch) {
      admittedBay = bayMatch[1].trim();
      auditEvents.push(`Admitted to ${bayMatch[1].trim()}`);
      continue;
    }

    const handoverMatch = trimmed.match(/\[(?:HANDOVER|CLINICAL NOTE|TRIAGE NOTE):\s*([^\]]+)\]/i);
    if (handoverMatch) {
      clinicalHandover = handoverMatch[1].trim();
      continue;
    }

    if (trimmed.startsWith("[PATIENT REVIEW")) {
      continue;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      auditEvents.push(trimmed.slice(1, -1));
    }
  }

  if (!admittedBay) {
    const inlineBay = notes.match(/admitted to\s+([A-Za-z0-9\s\-\/]+?)(?:\.|\n|$)/i);
    if (inlineBay) admittedBay = inlineBay[1].trim();
  }

  return { admittedBay, clinicalHandover, auditEvents };
}

export function HospitalAuditHistoryView({
  requests,
  hospitalName,
}: {
  requests: EmergencyRequest[];
  hospitalName?: string | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [nowTimestamp, setNowTimestamp] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [triageFilter, setTriageFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<EmergencyRequest | null>(null);

  useEffect(() => {
    setNowTimestamp(Date.now());
  }, []);

  // Derived KPI Auditing Stats
  const auditStats = useMemo(() => {
    const total = requests.length;
    let completed = 0;
    let admitted = 0;
    let cancelled = 0;
    let highPriority = 0;
    let totalTurnaroundMinutes = 0;
    let turnaroundCount = 0;

    requests.forEach((r) => {
      const s = (r.status || "").toLowerCase();
      if (s.includes("complete") || s.includes("admit")) completed++;
      if (s.includes("admit")) admitted++;
      if (s.includes("cancel") || s.includes("fail")) cancelled++;
      if (r.priority === 1 || r.priority === "1") highPriority++;

      if (r.completed_at && r.created_at) {
        const diffMs = new Date(r.completed_at).getTime() - new Date(r.created_at).getTime();
        if (diffMs > 0 && diffMs < 86400000 * 3) {
          totalTurnaroundMinutes += diffMs / (1000 * 60);
          turnaroundCount++;
        }
      }
    });

    const avgMinutes = turnaroundCount > 0 ? Math.round(totalTurnaroundMinutes / turnaroundCount) : null;

    return {
      total,
      completed,
      admitted,
      cancelled,
      highPriority,
      avgMinutes,
    };
  }, [requests]);

  // Unique triage categories
  const triageCategories = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.emergency_type) set.add(r.emergency_type);
    });
    return Array.from(set).sort();
  }, [requests]);

  // Filtered requests for auditing table
  const filtered = useMemo(() => {
    const now = nowTimestamp || Date.now();
    return requests.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== "all") {
        const s = (r.status || "").toLowerCase();
        if (statusFilter === "completed" && !s.includes("complete") && !s.includes("admit")) {
          return false;
        }
        if (statusFilter === "admitted" && !s.includes("admit")) {
          return false;
        }
        if (statusFilter === "cancelled" && !s.includes("cancel") && !s.includes("fail")) {
          return false;
        }
        if (statusFilter === "active" && (s.includes("complete") || s.includes("cancel") || s.includes("fail") || s.includes("admit"))) {
          return false;
        }
      }

      // 2. Triage category
      if (triageFilter !== "all" && r.emergency_type !== triageFilter) {
        return false;
      }

      // 3. Date range filter
      if (dateRangeFilter !== "all") {
        const createdMs = new Date(r.created_at).getTime();
        const diffHours = (now - createdMs) / (1000 * 60 * 60);
        if (dateRangeFilter === "24h" && diffHours > 24) return false;
        if (dateRangeFilter === "7d" && diffHours > 24 * 7) return false;
        if (dateRangeFilter === "30d" && diffHours > 24 * 30) return false;
      }

      // 4. Text Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const loc = formatLocation(r).toLowerCase();
        const id = r.id.toLowerCase();
        const type = (r.emergency_type || "").toLowerCase();
        const driverName = (r.driver?.display_name || "").toLowerCase();
        const vehicle = (r.driver?.vehicle_label || "").toLowerCase();
        const phone = (r.contact_phone || "").toLowerCase();
        const notes = (r.notes || "").toLowerCase();
        const age = resolvePatientAgeBand(r).toLowerCase();

        return (
          loc.includes(term) ||
          id.includes(term) ||
          type.includes(term) ||
          driverName.includes(term) ||
          vehicle.includes(term) ||
          phone.includes(term) ||
          notes.includes(term) ||
          age.includes(term)
        );
      }

      return true;
    });
  }, [requests, statusFilter, triageFilter, dateRangeFilter, searchTerm, nowTimestamp]);

  // Export to CSV Function for Auditing Reports
  function exportAuditCSV() {
    if (!filtered.length) return;

    const headers = [
      "Audit ID",
      "Created At",
      "Completed At",
      "Status",
      "Priority",
      "Emergency Type",
      "Patient Age Band",
      "Patient Contact",
      "Patient Location",
      "Assigned Ambulance",
      "Vehicle Plate",
      "Admitted Bay/Bed",
      "Clinical Notes",
      "Patient Rating",
    ];

    const rows = filtered.map((r) => {
      const parsedNotes = parseHospitalAdmissionDetails(r.notes);
      const cleanNotes = getCleanMedicalNotes(r.notes);
      const review = parsePatientReview(r.notes);

      return [
        `"${r.id}"`,
        `"${r.created_at}"`,
        `"${r.completed_at || ""}"`,
        `"${r.status}"`,
        `"${r.priority || "Standard"}"`,
        `"${(r.emergency_type || "").replace(/"/g, '""')}"`,
        `"${resolvePatientAgeBand(r)}"`,
        `"${r.contact_phone || ""}"`,
        `"${formatLocation(r).replace(/"/g, '""')}"`,
        `"${(r.driver?.display_name || "").replace(/"/g, '""')}"`,
        `"${(r.driver?.vehicle_label || "").replace(/"/g, '""')}"`,
        `"${(parsedNotes.admittedBay || "").replace(/"/g, '""')}"`,
        `"${cleanNotes.replace(/"/g, '""')}"`,
        `"${review ? review.rating + "/5" : "N/A"}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Hospital_Audit_Report_${(hospitalName || "Facility").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* 1. Hospital Executive Auditing KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Total Handled Cases
          </div>
          <div className="text-2xl font-black text-[var(--foreground)] mt-1">
            {auditStats.total}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">Facility lifetime intake</div>
        </div>

        <div className="card p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Admitted / Closed
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {auditStats.completed}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-0.5">
            Confirmed emergency intake
          </div>
        </div>

        <div className="card p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
            Priority 1 Trauma
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
            {auditStats.highPriority}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400/80 mt-0.5">
            Critical triage alarms
          </div>
        </div>

        <div className="card p-3.5 bg-slate-500/10 border border-[var(--border)] rounded-xl shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Diverted / Cancelled
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
            {auditStats.cancelled}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-0.5">Redirected or retracted</div>
        </div>

        <div className="card p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl shadow-xs col-span-2 md:col-span-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
            Avg Turnaround Time
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {auditStats.avgMinutes != null ? `${auditStats.avgMinutes}m` : "—"}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-0.5">
            Dispatch to bed admission
          </div>
        </div>
      </div>

      {/* 2. Audit Filter Toolbar & Compliance Actions */}
      <div className="card p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search audit trail by Case ID, patient location, phone, unit plate, bay #, clinical notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full text-xs py-2 pl-8 rounded-lg"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[var(--muted)]" />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select text-xs py-1.5 px-2.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
            >
              <option value="all">All Outcomes</option>
              <option value="completed">Admitted & Completed</option>
              <option value="cancelled">Cancelled / Diverted</option>
              <option value="active">Active Intake</option>
            </select>

            <select
              value={triageFilter}
              onChange={(e) => setTriageFilter(e.target.value)}
              className="select text-xs py-1.5 px-2.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
            >
              <option value="all">All Triage Codes</option>
              {triageCategories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="select text-xs py-1.5 px-2.5 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
            >
              <option value="all">All History</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            {(searchTerm || statusFilter !== "all" || triageFilter !== "all" || dateRangeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTriageFilter("all");
                  setDateRangeFilter("all");
                }}
                className="btn btn-ghost text-xs px-2.5 py-1 text-rose-500 hover:text-rose-600"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={exportAuditCSV}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download hospital auditing spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--muted)] border-t border-[var(--border)] pt-2.5">
          <span>
            Showing <strong className="text-[var(--foreground)]">{filtered.length}</strong> audited records (from{" "}
            {requests.length} lifetime facility admissions)
          </span>
          <span className="text-[11px] flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Confidential Hospital Audit Archive</span>
          </span>
        </div>
      </div>

      {/* 3. Hospital Professional Audit Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-sm text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-base font-semibold text-[var(--foreground)]">No audit logs matching query</p>
          <p className="text-xs text-[var(--muted)] mt-1">
            Try adjusting your search query, outcome status, or date range filter.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden border border-[var(--border)] rounded-xl bg-[var(--surface)]">
          <div className="overflow-x-auto w-full">
            <table className="data w-full text-left" style={{ minWidth: "980px" }}>
              <thead>
                <tr>
                  <th className="min-w-[180px]">Case ID &amp; Time</th>
                  <th className="min-w-[160px]">Triage Classification</th>
                  <th className="min-w-[140px]">Outcome Status</th>
                  <th className="min-w-[200px]">Admitted Bay &amp; SBAR</th>
                  <th className="min-w-[180px]">Transport Unit</th>
                  <th className="min-w-[100px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const parsedNotes = parseHospitalAdmissionDetails(req.notes);
                  const cleanNotes = getCleanMedicalNotes(req.notes);
                  const review = parsePatientReview(req.notes);

                  return (
                    <tr key={req.id} className="hover:bg-[var(--surface-raised)] transition-colors">
                      {/* 1. Case ID & Time */}
                      <td>
                        <div className="font-mono text-xs font-bold text-[var(--foreground)]">
                          #{req.id.slice(0, 8)}
                        </div>
                        <div className="text-[11px] text-[var(--muted)] mt-0.5">
                          {formatDateTime(req.created_at)}
                        </div>
                        <div className="text-[10px] text-[var(--muted)] mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{timeSince(req.created_at)}</span>
                        </div>
                      </td>

                      {/* 2. Triage Classification */}
                      <td>
                        <div className="font-bold text-xs text-[var(--foreground)]">
                          {req.emergency_type || "Emergency Incident"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              req.priority === 1 || req.priority === "1"
                                ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            P{req.priority || "Standard"}
                          </span>
                          <span className="text-[11px] text-[var(--muted)]">
                            {resolvePatientAgeBand(req)}
                          </span>
                        </div>
                      </td>

                      {/* 3. Outcome Status */}
                      <td>
                        <StatusBadge status={req.status} />
                        {req.completed_at && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono font-medium">
                            Admitted {formatDateTime(req.completed_at).slice(11)}
                          </div>
                        )}
                      </td>

                      {/* 4. Admitted Bay & SBAR */}
                      <td className="max-w-[240px]">
                        {parsedNotes.admittedBay ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 mb-1">
                            <BedDouble className="w-3.5 h-3.5" />
                            <span>{parsedNotes.admittedBay}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--muted)] italic block mb-1">
                            Direct intake
                          </span>
                        )}

                        {cleanNotes ? (
                          <p className="text-[11px] text-[var(--muted)] truncate line-clamp-1">
                            {cleanNotes}
                          </p>
                        ) : null}

                        {review && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>Rated {review.rating}/5</span>
                          </div>
                        )}
                      </td>

                      {/* 5. Transport Unit */}
                      <td>
                        <div className="font-semibold text-xs text-[var(--foreground)]">
                          {req.driver?.display_name || "Unassigned"}
                        </div>
                        {req.driver?.vehicle_label && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--muted)]">
                            {req.driver.vehicle_label}
                          </span>
                        )}
                        <div className="text-[11px] text-[var(--muted)] truncate max-w-[180px] mt-0.5">
                          {formatLocation(req)}
                        </div>
                      </td>

                      {/* 6. Action */}
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCase(req)}
                          className="btn btn-ghost text-xs px-2.5 py-1 font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Audit Record</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Complete Audit Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--border)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-bold">Clinical &amp; Operational Audit Record</h2>
                </div>
                <div className="text-xs text-[var(--muted)] mt-0.5 font-mono">
                  Full Case Identifier: {selectedCase.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg p-1 rounded-lg hover:bg-[var(--surface-raised)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Case Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Triage Classification</span>
                <span className="font-bold text-sm text-[var(--foreground)] mt-0.5 block">
                  {selectedCase.emergency_type || "Emergency"}
                </span>
                <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                  Priority {selectedCase.priority || "Standard"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Incident Status</span>
                <div className="mt-1">
                  <StatusBadge status={selectedCase.status} />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--muted)] block">Patient Age Band</span>
                <span className="font-bold text-sm text-[var(--foreground)] mt-0.5 block">
                  {resolvePatientAgeBand(selectedCase)}
                </span>
              </div>
            </div>

            {/* Transport & Location */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs space-y-2">
              <div>
                <strong className="text-[var(--foreground)]">Patient Pickup Location:</strong>{" "}
                <span className="text-[var(--muted)]">{formatLocation(selectedCase)}</span>
              </div>
              {selectedCase.contact_phone && (
                <div>
                  <strong className="text-[var(--foreground)]">Patient Phone:</strong>{" "}
                  <a href={`tel:${selectedCase.contact_phone}`} className="text-emerald-600 font-bold hover:underline">
                    {selectedCase.contact_phone}
                  </a>
                </div>
              )}
              <div>
                <strong className="text-[var(--foreground)]">Assigned Transport Unit:</strong>{" "}
                <span className="text-[var(--muted)]">
                  {selectedCase.driver?.display_name || "Unassigned"}
                  {selectedCase.driver?.vehicle_label ? ` (${selectedCase.driver.vehicle_label})` : ""}
                </span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Dispatch Created:</span>
                <span className="font-mono font-semibold">{formatDateTime(selectedCase.created_at)}</span>
              </div>
              {selectedCase.completed_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Case Completed / Admitted:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatDateTime(selectedCase.completed_at)}
                  </span>
                </div>
              )}
            </div>

            {/* Clinical Handover & Bed Notes */}
            {(() => {
              const notesParsed = parseHospitalAdmissionDetails(selectedCase.notes);
              const cleanNotes = getCleanMedicalNotes(selectedCase.notes);
              const review = parsePatientReview(selectedCase.notes);

              return (
                <div className="space-y-3">
                  {notesParsed.admittedBay && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">
                        Assigned Receiving Bay / Bed
                      </span>
                      <span className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                        🛌 {notesParsed.admittedBay}
                      </span>
                    </div>
                  )}

                  {cleanNotes && (
                    <div className="p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs">
                      <span className="text-[10px] uppercase font-bold text-[var(--muted)] block mb-1">
                        Triage &amp; Handover Notes
                      </span>
                      <p className="text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">{cleanNotes}</p>
                    </div>
                  )}

                  {review && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 block">
                        Direct Patient Review &amp; Rating
                      </span>
                      <div className="text-amber-600 font-bold flex items-center gap-1">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="ml-1">({review.rating}/5)</span>
                      </div>
                      <p className="italic text-amber-950 dark:text-amber-100">&ldquo;{review.remark}&rdquo;</p>
                      {review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {review.tags.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-bold text-amber-800 dark:text-amber-200"
                            >
                              ✓ {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="border-t border-[var(--border)] pt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="btn py-2 px-5 text-xs font-semibold rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] hover:bg-[var(--border)]"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
