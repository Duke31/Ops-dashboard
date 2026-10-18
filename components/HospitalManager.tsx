"use client";

import { FormEvent, useEffect, useRef, useState, useMemo } from "react";
import type { Hospital, Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { rpcMessage } from "@/lib/rpc-error";
import {
  detectCluster,
  REGION_CLUSTERS,
  type RegionClusterKey,
} from "@/lib/regionClusters";
import {
  Building2,
  Filter,
  MapPin,
  Phone,
  ShieldCheck,
  Plus,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { createStaffAccount } from "@/app/admin/staff/actions";

type FormState = {
  id: string | null;
  name: string;
  address: string;
  lat: string;
  lng: string;
  intake_phone: string;
  cluster: RegionClusterKey;
};

const CACHE_KEY = "ops-hospital-extras";

function readCache(): Record<string, Partial<Hospital>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}") as Record<
      string,
      Partial<Hospital>
    >;
  } catch {
    return {};
  }
}

function writeCache(rows: Hospital[]) {
  const extras: Record<string, Partial<Hospital>> = {};
  for (const h of rows) {
    extras[h.id] = {
      address: h.address,
      lat: h.lat,
      lng: h.lng,
      intake_phone: h.intake_phone ?? null,
    };
  }
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(extras));
}

function merge(list: Hospital[]): Hospital[] {
  const extras = readCache();
  return list.map((h) => ({
    ...h,
    address: h.address || extras[h.id]?.address || null,
    lat: h.lat ?? extras[h.id]?.lat ?? null,
    lng: h.lng ?? extras[h.id]?.lng ?? null,
    intake_phone: h.intake_phone ?? extras[h.id]?.intake_phone ?? null,
  }));
}

const empty: FormState = {
  id: null,
  name: "",
  address: "",
  lat: "",
  lng: "",
  intake_phone: "",
  cluster: "osun_pilot",
};

export function HospitalManager({
  hospitals: initial,
  profiles = [],
}: {
  hospitals: Hospital[];
  profiles?: Profile[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Hospital[]>(() => merge(initial));
  const [selectedClusterFilter, setSelectedClusterFilter] =
    useState<RegionClusterKey>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [showAddForm, setShowAddForm] = useState(false);

  // Quick Create Profile Modal state
  const [deskModalHospital, setDeskModalHospital] = useState<Hospital | null>(null);
  const [deskForm, setDeskForm] = useState({
    displayName: "",
    email: "",
    password: "Password123!",
  });
  const [creatingDesk, setCreatingDesk] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setRows(merge(initial));
  }, [initial]);

  // Group profiles by hospital_id
  const hospitalProfilesMap = useMemo(() => {
    const map = new Map<string, Profile[]>();
    for (const p of profiles) {
      if (p.hospital_id) {
        const list = map.get(p.hospital_id) || [];
        list.push(p);
        map.set(p.hospital_id, list);
      }
    }
    return map;
  }, [profiles]);

  const filteredRows = useMemo(() => {
    if (selectedClusterFilter === "all") return rows;
    return rows.filter((h) => detectCluster(h) === selectedClusterFilter);
  }, [rows, selectedClusterFilter]);

  const clusterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: rows.length,
      ibadan_private: 0,
      osun_pilot: 0,
      lagos_metropolitan: 0,
    };
    for (const r of rows) {
      const c = detectCluster(r);
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [rows]);

  function fill(h: Hospital) {
    const cluster = detectCluster(h);
    setForm({
      id: h.id,
      name: h.name,
      address: h.address || "",
      lat: h.lat != null ? String(h.lat) : "",
      lng: h.lng != null ? String(h.lng) : "",
      intake_phone: (h as Hospital & { intake_phone?: string }).intake_phone || "",
      cluster: cluster === "all" ? "ibadan_private" : cluster,
    });
    setShowAddForm(true);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function openCreateDeskModal(h: Hospital) {
    const slug = h.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 10);
    setDeskModalHospital(h);
    setDeskForm({
      displayName: `${h.name.split(" ")[0]} Intake Desk`,
      email: `desk.${slug}@solace.internal`,
      password: "Password123!",
    });
  }

  async function handleCreateDeskSubmit(e: FormEvent) {
    e.preventDefault();
    if (!deskModalHospital) return;
    setCreatingDesk(true);
    setError(null);
    try {
      const result = await createStaffAccount({
        email: deskForm.email,
        password: deskForm.password,
        displayName: deskForm.displayName,
        role: "hospital",
        hospital_id: deskModalHospital.id,
        vehicle_label: null,
      });

      if (!result.ok) {
        setError(result.error);
        setCreatingDesk(false);
        return;
      }

      setOk(`Hospital Desk account created for ${deskModalHospital.name}! Login: ${deskForm.email}`);
      setDeskModalHospital(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile.");
    } finally {
      setCreatingDesk(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setOk(null);

    const name = form.name.trim();
    const address = form.address.trim() || null;
    const lat = form.lat.trim() ? Number(form.lat) : null;
    const lng = form.lng.trim() ? Number(form.lng) : null;
    const intake_phone = form.intake_phone.trim() || null;

    if (!name) {
      setError("Hospital name is required.");
      setBusy(false);
      return;
    }

    try {
      const supabase = createClient();
      if (form.id) {
        // Edit hospital
        const { error: updErr } = await supabase
          .from("hospitals")
          .update({
            name,
            address,
            lat,
            lng,
            intake_phone,
          })
          .eq("id", form.id);

        if (updErr) {
          setError(rpcMessage(updErr));
          setBusy(false);
          return;
        }

        const next = rows.map((r) =>
          r.id === form.id
            ? { ...r, name, address, lat, lng, intake_phone }
            : r,
        );
        writeCache(next);
        setRows(next);
        setOk(`Updated ${name}`);
        setForm(empty);
        setShowAddForm(false);
        router.refresh();
      } else {
        // Create hospital
        const { data: newHosp, error: insErr } = await supabase
          .from("hospitals")
          .insert({
            name,
            address,
            lat,
            lng,
            intake_phone,
            available_capacity: 5,
          })
          .select("id, name, address, lat, lng, intake_phone, available_capacity")
          .single();

        if (insErr) {
          setError(rpcMessage(insErr));
          setBusy(false);
          return;
        }

        const next = [newHosp as Hospital, ...rows];
        writeCache(next);
        setRows(next);
        setOk(`Created ${name}`);
        setForm(empty);
        setShowAddForm(false);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(h: Hospital) {
    if (busy) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to remove ${h.name}? This will affect dispatch routing and any linked desk accounts.`,
    );
    if (!confirmDelete) return;

    setBusy(true);
    setError(null);
    setOk(null);

    try {
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("hospitals")
        .delete()
        .eq("id", h.id);

      if (delErr) {
        setError(rpcMessage(delErr));
        setBusy(false);
        return;
      }

      const next = rows.filter((r) => r.id !== h.id);
      writeCache(next);
      setRows(next);
      setOk(`Deleted ${h.name}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cluster Filter & Actions Bar */}
      <div className="card p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Region Clusters:</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedClusterFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedClusterFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm"
                : "bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border)]"
            }`}
          >
            All Clusters ({clusterCounts.all})
          </button>

          <button
            type="button"
            onClick={() => setSelectedClusterFilter("ibadan_private")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedClusterFilter === "ibadan_private"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border)]"
            }`}
          >
            🏥 Ibadan Private ({clusterCounts.ibadan_private})
          </button>

          <button
            type="button"
            onClick={() => setSelectedClusterFilter("osun_pilot")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedClusterFilter === "osun_pilot"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border)]"
            }`}
          >
            🏛️ Osun OSEMSAS Pilot ({clusterCounts.osun_pilot})
          </button>

          <button
            type="button"
            onClick={() => setSelectedClusterFilter("lagos_metropolitan")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedClusterFilter === "lagos_metropolitan"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--border)]"
            }`}
          >
            🌊 Lagos Metro ({clusterCounts.lagos_metropolitan})
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setForm(empty);
          }}
          className="btn btn-primary text-xs px-3 py-2 flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? "Close Form" : "Add Partner Hospital"}</span>
        </button>
      </div>

      {/* Hospital Add / Edit Form */}
      {showAddForm && (
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="card p-4 sm:p-5 border-2 border-primary/30 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <div className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span>{form.id ? "Edit Partner Facility" : "Add Partner Hospital"}</span>
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Register private facilities in Ibadan, Osun State referral hubs, or regional emergency trauma centres.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setForm(empty);
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                Hospital / Facility Name *
              </label>
              <input
                className="input text-sm"
                placeholder="e.g. LifeCare Specialist Hospital & Surgical Centre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                Regional Pilot Cluster
              </label>
              <select
                className="select text-sm"
                value={form.cluster}
                onChange={(e) =>
                  setForm({ ...form, cluster: e.target.value as RegionClusterKey })
                }
              >
                <option value="ibadan_private">Ibadan Private Hospital Network (Oyo)</option>
                <option value="osun_pilot">Osun State Government Pilot (OSEMSAS)</option>
                <option value="lagos_metropolitan">Lagos Metropolitan Health Network</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                Address & City *
              </label>
              <input
                className="input text-sm"
                placeholder="e.g. Ring Road / Bodija, Ibadan, Oyo State"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                Emergency Intake Phone / Hotline
              </label>
              <input
                className="input text-sm font-mono"
                placeholder="e.g. 08031234567"
                value={form.intake_phone}
                onChange={(e) => setForm({ ...form, intake_phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                  Latitude
                </label>
                <input
                  className="input text-sm font-mono"
                  placeholder="7.3775"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                  Longitude
                </label>
                <input
                  className="input text-sm font-mono"
                  placeholder="3.9470"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
            <button className="btn btn-primary text-xs px-4 py-2" type="submit" disabled={busy}>
              {busy ? "Saving…" : form.id ? "Update Hospital" : "Create Hospital"}
            </button>
            <button
              className="btn btn-ghost text-xs px-3 py-2"
              type="button"
              disabled={busy}
              onClick={() => {
                setShowAddForm(false);
                setForm(empty);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Facilities List Table with Desk Profiles */}
      <div className="card overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Partner Facilities & Assigned Hospital Desks</span>
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Each hospital connects to a dedicated triage desk account to receive incoming transfers, SBAR alerts, and bed capacity updates.
            </p>
          </div>
          <div className="text-xs text-[var(--muted)]">
            Showing <strong className="text-[var(--foreground)]">{filteredRows.length}</strong> facilities
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="data w-full text-left" style={{ minWidth: "960px" }}>
            <thead>
              <tr>
                <th className="px-4 py-3 min-w-[260px] text-left">Hospital &amp; Cluster</th>
                <th className="px-4 py-3 min-w-[240px] text-left">Address &amp; Phone</th>
                <th className="px-4 py-3 min-w-[240px] text-left">Assigned Hospital Desk Profiles</th>
                <th className="px-4 py-3 min-w-[120px] text-left">Capacity</th>
                <th className="px-4 py-3 min-w-[200px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-[var(--muted)] text-center py-6 px-4">
                    No hospitals found in this regional cluster.
                  </td>
                </tr>
              )}
              {filteredRows.map((h) => {
                const cluster = detectCluster(h);
                const clusterInfo = REGION_CLUSTERS[cluster];
                const deskProfiles = hospitalProfilesMap.get(h.id) || [];
                const hasDesk = deskProfiles.length > 0;

                return (
                  <tr key={h.id} className="hover:bg-[var(--surface-raised)] transition-colors">
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-bold text-sm text-[var(--foreground)] leading-tight">{h.name}</div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {clusterInfo.badge}
                        </span>
                        {h.lat != null && h.lng != null && (
                          <span className="text-[10px] font-mono text-[var(--muted)]">
                            ({h.lat.toFixed(3)}, {h.lng.toFixed(3)})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 align-top text-xs max-w-[240px]">
                      <div className="text-[var(--muted)] truncate">{h.address || "—"}</div>
                      {(h as Hospital & { intake_phone?: string }).intake_phone && (
                        <a
                          href={`tel:${(h as Hospital & { intake_phone?: string }).intake_phone}`}
                          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{(h as Hospital & { intake_phone?: string }).intake_phone}</span>
                        </a>
                      )}
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      {hasDesk ? (
                        <div className="space-y-1">
                          {deskProfiles.map((dp) => (
                            <div
                              key={dp.user_id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="font-bold">{dp.display_name}</span>
                              {dp.email && (
                                <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400/80">
                                  ({dp.email})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>No desk profile</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => openCreateDeskModal(h)}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Create</span>
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 align-top">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          (h.available_capacity ?? 0) === 0
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                        }`}
                      >
                        {h.available_capacity ?? 0} beds
                      </span>
                    </td>

                    <td className="px-4 py-3.5 align-top text-right">
                      <div className="flex items-center gap-1.5 justify-end whitespace-nowrap">
                        <Link
                          href={`/hospital?facilityId=${h.id}`}
                          className="btn btn-ghost text-xs px-2.5 py-1 font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 inline-flex items-center gap-1 whitespace-nowrap"
                          title="Inspect incoming triage queue in Read-Only Supervisor Monitor Mode"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span>Desk View</span>
                        </Link>

                        <button
                          className="btn btn-ghost text-xs px-2 py-1 font-semibold shrink-0"
                          type="button"
                          disabled={busy}
                          onClick={() => openCreateDeskModal(h)}
                          title="Add an additional desk user profile for this hospital"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          className="btn btn-ghost text-xs px-2.5 py-1 font-semibold shrink-0"
                          type="button"
                          disabled={busy}
                          onClick={() => fill(h)}
                        >
                          Edit
                        </button>

                        <button
                          className="btn btn-ghost text-xs px-2.5 py-1 text-red-600 dark:text-red-400 font-semibold shrink-0"
                          type="button"
                          disabled={busy}
                          onClick={() => onDelete(h)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Create Desk Profile Modal */}
      {deskModalHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="card max-w-md w-full p-5 space-y-4 shadow-2xl border-2 border-primary/30">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span>Create Hospital Desk Account</span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Provision a clinical triage intake login profile for{" "}
                  <strong className="text-[var(--foreground)]">{deskModalHospital.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeskModalHospital(null)}
                className="text-[var(--muted)] hover:text-[var(--foreground)] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeskSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                  Desk Officer / Display Name *
                </label>
                <input
                  className="input text-sm"
                  placeholder="e.g. UCH Emergency Desk"
                  value={deskForm.displayName}
                  onChange={(e) =>
                    setDeskForm({ ...deskForm, displayName: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                  Login Email *
                </label>
                <input
                  className="input text-sm"
                  type="email"
                  placeholder="e.g. desk.uch@solace.internal"
                  value={deskForm.email}
                  onChange={(e) =>
                    setDeskForm({ ...deskForm, email: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                  Temporary Password (8+ chars) *
                </label>
                <input
                  className="input text-sm"
                  type="password"
                  value={deskForm.password}
                  onChange={(e) =>
                    setDeskForm({ ...deskForm, password: e.target.value })
                  }
                  minLength={8}
                  required
                />
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--muted)] space-y-1">
                <div className="font-semibold text-[var(--foreground)]">Auto-Linked Facility:</div>
                <div className="truncate">{deskModalHospital.name}</div>
                <div className="text-[11px] font-mono opacity-80">{deskModalHospital.id}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeskModalHospital(null)}
                  className="btn btn-ghost text-xs px-3 py-2"
                  disabled={creatingDesk}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs px-4 py-2"
                  disabled={creatingDesk}
                >
                  {creatingDesk ? "Creating Desk Account…" : "Create Hospital Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </div>
  );
}
