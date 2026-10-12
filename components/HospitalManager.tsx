"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Hospital } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { rpcMessage } from "@/lib/rpc-error";
import { resolveItemCluster, REGION_CLUSTERS, RegionClusterId } from "@/lib/regionClusters";

type FormState = {
  id: string | null;
  name: string;
  address: string;
  lat: string;
  lng: string;
  intake_phone: string;
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
};

export function HospitalManager({ hospitals }: { hospitals: Hospital[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [rows, setRows] = useState<Hospital[]>(() => merge(hospitals));
  const inFlight = useRef(false);

  // Quick Account Modal State
  const [createAccountModal, setCreateAccountModal] = useState<Hospital | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");

  useEffect(() => {
    setRows(merge(hospitals));
  }, [hospitals]);

  function fill(h: Hospital) {
    setForm({
      id: h.id,
      name: h.name ?? "",
      address: h.address ?? "",
      lat: h.lat != null ? String(h.lat) : "",
      lng: h.lng != null ? String(h.lng) : "",
      intake_phone: (h as Hospital & { intake_phone?: string }).intake_phone ?? "",
    });
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || busy) return;
    inFlight.current = true;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const { data, error: err } = await supabase.rpc("admin_save_hospital", {
        p_id: form.id,
        p_name: form.name.trim(),
        p_address: form.address.trim() || null,
        p_lat: form.lat === "" ? null : Number(form.lat),
        p_lng: form.lng === "" ? null : Number(form.lng),
        p_intake_phone: form.intake_phone.trim() || null,
      });
      if (err) throw err;
      const saved = (Array.isArray(data) ? data[0] : data) as Hospital | null;
      if (saved?.id) {
        setRows((cur) => {
          const next = cur.filter((h) => h.id !== saved.id);
          next.push(saved);
          const sorted = next.sort((a, b) => a.name.localeCompare(b.name));
          writeCache(sorted);
          return sorted;
        });
      } else {
        const fallback: Hospital = {
          id: form.id || crypto.randomUUID(),
          name: form.name.trim(),
          address: form.address.trim() || null,
          lat: form.lat === "" ? null : Number(form.lat),
          lng: form.lng === "" ? null : Number(form.lng),
          intake_phone: form.intake_phone.trim() || null,
          available_capacity: null,
        };
        setRows((cur) => {
          const next = form.id
            ? cur.map((h) => (h.id === form.id ? { ...h, ...fallback, id: form.id } : h))
            : [...cur, fallback];
          writeCache(next);
          return next;
        });
      }
      setOk(form.id ? "Hospital updated." : "Hospital created.");
      setForm(empty);
      router.refresh();
    } catch (e) {
      setError(rpcMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function onDelete(h: Hospital) {
    if (inFlight.current || busy) return;
    const okConfirm = window.confirm(
      `Delete “${h.name}”? This only works if no request, staff, or driver uses it.`,
    );
    if (!okConfirm) return;
    inFlight.current = true;
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const { error: err } = await supabase.rpc("admin_delete_hospital", {
        p_id: h.id,
      });
      if (err) throw err;
      setRows((cur) => {
        const next = cur.filter((row) => row.id !== h.id);
        writeCache(next);
        return next;
      });
      if (form.id === h.id) setForm(empty);
      setOk("Hospital deleted.");
      router.refresh();
    } catch (e) {
      setError(rpcMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function handleCreateHospitalLogin(e: FormEvent) {
    e.preventDefault();
    if (!createAccountModal || busy) return;
    setBusy(true);
    setError(null);
    setOk(null);

    try {
      // Create user via Supabase auth sign-up with hospital role & hospital_id metadata
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: accountEmail.trim(),
        password: accountPassword.trim(),
        options: {
          data: {
            role: "hospital",
            hospital_id: createAccountModal.id,
            display_name: `${createAccountModal.name} Desk`,
          },
        },
      });

      if (signUpErr) throw signUpErr;

      // Ensure profile entry exists
      if (data.user?.id) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          role: "hospital",
          hospital_id: createAccountModal.id,
          full_name: `${createAccountModal.name} Desk`,
        });
      }

      setOk(`Hospital intake desk account created for ${createAccountModal.name} (${accountEmail}).`);
      setCreateAccountModal(null);
      setAccountEmail("");
      setAccountPassword("");
      router.refresh();
    } catch (err: unknown) {
      setError(rpcMessage(err) || "Failed to create hospital desk account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hospital Form */}
      <form onSubmit={onSubmit} className="card p-5 grid md:grid-cols-2 gap-3 border border-slate-700/80 bg-slate-900/60 shadow-lg">
        <div className="md:col-span-2 flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>🏥</span>
            {form.id ? "Edit Facility Specification" : "Register New Hospital Facility"}
          </div>
          <span className="text-xs text-slate-400">
            Coordinates enable automated regional cluster matching
          </span>
        </div>
        <input
          className="input"
          placeholder="Facility Name (e.g. Ring Road State Hospital)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Emergency Intake Phone (e.g. +234...)"
          value={form.intake_phone}
          onChange={(e) => setForm({ ...form, intake_phone: e.target.value })}
        />
        <input
          className="input md:col-span-2"
          placeholder="Physical Address / Landmark"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <input
          className="input"
          placeholder="Latitude (e.g. 7.3775)"
          inputMode="decimal"
          value={form.lat}
          onChange={(e) => setForm({ ...form, lat: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Longitude (e.g. 3.9470)"
          inputMode="decimal"
          value={form.lng}
          onChange={(e) => setForm({ ...form, lng: e.target.value })}
          required
        />
        <div className="md:col-span-2 flex gap-2 pt-1">
          <button className="btn btn-primary px-5" type="submit" disabled={busy}>
            {busy ? "Saving…" : form.id ? "Update Facility" : "Add Facility to Network"}
          </button>
          {form.id && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setForm(empty)}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {/* Facilities Catalog Table */}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Facility Name</th>
              <th>Regional Cluster</th>
              <th>Emergency Hotline</th>
              <th>Beds</th>
              <th>Desk Audit & Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-6">
                  No hospitals registered yet.
                </td>
              </tr>
            )}
            {rows.map((h) => {
              const clusterId = resolveItemCluster({
                lat: h.lat,
                lng: h.lng,
                address: h.address,
              });
              const clusterInfo = REGION_CLUSTERS[clusterId];

              return (
                <tr key={h.id}>
                  <td>
                    <div className="font-bold text-sm text-slate-100">{h.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{h.address || "No address"}</div>
                  </td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${clusterInfo?.tagColor || 'bg-slate-800 text-slate-300'}`}>
                      {clusterInfo?.shortName || clusterId}
                    </span>
                  </td>
                  <td>
                    {(h as Hospital & { intake_phone?: string }).intake_phone ? (
                      <a
                        href={`tel:${(h as Hospital & { intake_phone?: string }).intake_phone}`}
                        className="font-mono text-xs text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <span>📞</span>
                        <span>{(h as Hospital & { intake_phone?: string }).intake_phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`text-xs font-bold ${h.available_capacity === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {h.available_capacity ?? "—"} beds
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* 1-Click Desk View Launcher */}
                      <a
                        href={`/hospital?facilityId=${h.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                        title="Audit live intake desk for this facility"
                      >
                        <span>🖥️ Desk View</span>
                      </a>

                      {/* 1-Click New Staff Login modal */}
                      <button
                        type="button"
                        onClick={() => {
                          setCreateAccountModal(h);
                          setAccountEmail(`intake@${h.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);
                          setAccountPassword("SolaceCare@2026");
                        }}
                        className="btn btn-ghost text-xs py-1 px-2 border border-slate-700"
                        title="Create new intake desk login credentials"
                      >
                        + Create Login
                      </button>

                      <button
                        className="btn btn-ghost text-xs py-1 px-2"
                        type="button"
                        disabled={busy}
                        onClick={() => fill(h)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost text-xs py-1 px-2 text-rose-400 hover:bg-rose-950/40"
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

      {/* 1-Click Modal to Create Hospital Desk Account */}
      {createAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateHospitalLogin}
            className="card max-w-md w-full p-6 space-y-4 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">
                  Create Desk Login: {createAccountModal.name}
                </h3>
                <span className="text-xs text-slate-400">
                  Assigns role=hospital linked to facility UUID
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCreateAccountModal(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Login Email
                </label>
                <input
                  type="email"
                  className="input text-xs w-full bg-slate-950 border-slate-700"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  className="input text-xs w-full bg-slate-950 border-slate-700 font-mono"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateAccountModal(null)}
                className="btn btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary px-4 text-xs font-bold"
              >
                {busy ? "Creating…" : "Provision Login"}
              </button>
            </div>
          </form>
        </div>
      )}

      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </div>
  );
}
