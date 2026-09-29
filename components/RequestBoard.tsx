"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AppRole,
  Driver,
  EmergencyRequest,
  Hospital,
  TransitionRule,
} from "@/lib/types";
import { allowedTargets, formatLocation } from "@/lib/queries";
import { timeSince } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Toast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { rpcMessage } from "@/lib/rpc-error";

function needsDriver(toStatus: string) {
  return toStatus.toLowerCase().includes("driver assigned");
}


function networkPill(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = raw.toLowerCase();
  if (n === "4g" || n === "lte") return "4G";
  if (n === "3g") return "3G";
  if (n === "2g" || n === "slow-2g") return "2G (Degraded)";
  if (n === "wifi" || n === "wlan") return "Wi‑Fi";
  if (n === "offline") return "Offline";
  return raw.toUpperCase();
}

function sortDriversForAssign(list: Driver[]): Driver[] {
  return [...list].sort((a, b) => {
    const aa = a.active === true ? 0 : 1;
    const bb = b.active === true ? 0 : 1;
    if (aa !== bb) return aa - bb;
    return (a.display_name || "").localeCompare(b.display_name || "");
  });
}

function needsHospital(toStatus: string) {
  const s = toStatus.toLowerCase();
  return (
    s.includes("hospital") ||
    s.includes("match") ||
    s.includes("intake") ||
    s.includes("admit")
  );
}

function getHospitalCapacity(
  hospitalId: string | null | undefined,
  request: EmergencyRequest,
  hospitals: Pick<Hospital, "id" | "name" | "available_capacity">[],
): number | null {
  if (!hospitalId) return null;
  // Check embedded hospital in request first
  if (
    request.hospital &&
    request.hospital.id === hospitalId &&
    request.hospital.available_capacity != null
  ) {
    return request.hospital.available_capacity;
  }
  // Check hospitals list
  const found = hospitals.find((h) => h.id === hospitalId);
  if (found && found.available_capacity != null) {
    return found.available_capacity;
  }
  return null;
}

function getHospitalName(
  hospitalId: string | null | undefined,
  request: EmergencyRequest,
  hospitals: Pick<Hospital, "id" | "name" | "available_capacity">[],
): string {
  if (!hospitalId) return "Hospital";
  if (request.hospital && request.hospital.id === hospitalId && request.hospital.name) {
    return request.hospital.name;
  }
  const found = hospitals.find((h) => h.id === hospitalId);
  return found?.name || "Hospital";
}

export function RequestBoard({
  requests,
  rules,
  actorRole,
  hospitals = [],
  drivers = [],
  empty = "No active requests.",
}: {
  requests: EmergencyRequest[];
  rules: TransitionRule[];
  actorRole: AppRole;
  hospitals?: Pick<Hospital, "id" | "name" | "available_capacity">[];
  drivers?: Driver[];
  empty?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [driverDraft, setDriverDraft] = useState<Record<string, string>>({});
  const [hospitalDraft, setHospitalDraft] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Real-time synchronization for zero-delay operations
  useEffect(() => {
    const channel = supabase
      .channel("ops-request-board-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests" },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [supabase, router]);

  async function transition(
    request: EmergencyRequest,
    toStatus: string,
  ) {
    setError(null);
    setOk(null);

    const selectedDriver = driverDraft[request.id] || request.driver_id || "";
    if (needsDriver(toStatus) && !selectedDriver) {
      setError("Select a driver before Driver assigned.");
      return;
    }

    const hospitalId =
      hospitalDraft[request.id] || request.hospital_id || "";
    if (needsHospital(toStatus) && !hospitalId) {
      setError("Select a hospital before confirming.");
      return;
    }

    // STRICT CAPACITY GUARD: Check capacity from both list and request object
    if (needsHospital(toStatus) && hospitalId) {
      const cap = getHospitalCapacity(hospitalId, request, hospitals);
      if (cap === 0) {
        const name = getHospitalName(hospitalId, request, hospitals);
        setError(
          `⛔ Cannot confirm or route to "${name}": Facility is at 0 available beds (Full / Diversion). Please select another hospital with open capacity.`,
        );
        return;
      }
    }

    setBusyId(request.id);
    try {
      if (needsHospital(toStatus) && hospitalId !== request.hospital_id) {
        const { error: hospErr } = await supabase.rpc(
          "assign_emergency_hospital",
          {
            p_request_id: request.id,
            p_hospital_id: hospitalId,
          },
        );
        if (hospErr) throw hospErr;
      }

      if (needsDriver(toStatus) && selectedDriver !== request.driver_id) {
        const { error: drvErr } = await supabase.rpc("assign_emergency_driver", {
          p_request_id: request.id,
          p_driver_id: selectedDriver,
        });
        if (drvErr) throw drvErr;
      }

      const { error: rpcErr } = await supabase.rpc(
        "transition_emergency_state",
        {
          request_id: request.id,
          new_state: toStatus,
          actor_role: actorRole,
        },
      );
      if (rpcErr) throw rpcErr;
      setOk(`Moved to “${toStatus}”.`);
      router.refresh();
    } catch (e: unknown) {
      const msg = rpcMessage(e) || "Transition failed.";
      setError(msg);
    } finally {
      setBusyId(null);
    }
  }

  if (!requests.length) {
    return <p className="text-sm text-[var(--muted)]">{empty}</p>;
  }

  return (
    <>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Patient location</th>
              <th>Type</th>
              <th>Status</th>
              <th>Opened</th>
              <th>Hospital</th>
              <th>Driver</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const targets = allowedTargets(rules, r.status, actorRole);
              const showHospital = targets.some(needsHospital);
              const showDriver = targets.some(needsDriver) && !r.driver_id;
              const selectedDriver = driverDraft[r.id] ?? r.driver_id ?? "";
              const selectedHospital =
                hospitalDraft[r.id] ?? r.hospital_id ?? "";

              const effectiveCap = getHospitalCapacity(
                selectedHospital,
                r,
                hospitals,
              );
              const isSelectedHospitalFull = effectiveCap === 0;

              return (
                <tr key={r.id}>
                  <td className="max-w-[260px]">
                    <div className="font-semibold text-sm leading-snug text-slate-900 dark:text-slate-100 flex items-start gap-1">
                      <span className="text-red-600 mt-0.5">📍</span>
                      <span>{formatLocation(r)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {r.contact_phone && (
                        <a
                          href={`tel:${r.contact_phone}`}
                          className="font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1 transition-all"
                          title="Call patient"
                        >
                          <span>📞</span>
                          <span>{r.contact_phone}</span>
                        </a>
                      )}
                      {r.patient_age_band && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-raised,#f3f4f6)] text-[var(--muted)] border border-[var(--border,#e5e7eb)] font-medium">
                          {r.patient_age_band === "unknown" ? "Age: ?" : `${r.patient_age_band} yrs`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[220px]">
                    <div className="font-semibold text-sm">{r.emergency_type || "—"}</div>
                    {r.notes && (
                      <div className="mt-1 text-[11px] leading-tight text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/20 rounded p-1.5">
                        <span className="font-bold uppercase tracking-wider text-[9px] block opacity-75 mb-0.5">
                          Triage & Medical ID:
                        </span>
                        <span className="line-clamp-3 hover:line-clamp-none transition-all">{r.notes}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap text-[var(--muted)]">
                    {timeSince(r.created_at)}
                  </td>
                  <td>
                    {r.hospital?.name ? (
                      <div>
                        <div className="font-medium text-xs text-slate-900 dark:text-slate-100">
                          {r.hospital.name}
                        </div>
                        <div className="mt-0.5">
                          {r.hospital.available_capacity != null ? (
                            r.hospital.available_capacity === 0 ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                                ⛔ 0 Beds (Full)
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                {r.hospital.available_capacity} Beds Available
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-[12px]">
                    {(() => {
                      const d =
                        r.driver ||
                        drivers.find((x) => x.id === r.driver_id) ||
                        null;
                      if (!d?.display_name && !r.driver_id) return "—";
                      const bat = d?.battery_level;
                      const charging = d?.is_charging === true;
                      const low =
                        bat != null && bat <= 20 && d?.is_charging === false;
                      const net = networkPill(d?.network_type);
                      return (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {d?.display_name || "Assigned unit"}
                          </div>
                          {d?.vehicle_label && (
                            <div className="text-[var(--muted)]">
                              {d.vehicle_label}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {bat != null && (
                              <span
                                className={
                                  low
                                    ? "inline-flex rounded-full border border-red-500/50 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300"
                                    : "inline-flex rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[10px]"
                                }
                              >
                                {low
                                  ? `⚠️ Low Bat (${bat}%)`
                                  : `${charging ? "⚡" : "🔋"} ${bat}%`}
                              </span>
                            )}
                            {net && (
                              <span
                                className={
                                  net.includes("2G") || net === "Offline"
                                    ? "inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px]"
                                    : "inline-flex rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[10px]"
                                }
                              >
                                {net}
                              </span>
                            )}
                            {d?.last_location_at && (
                              <span className="text-[10px] text-[var(--muted)]">
                                {timeSince(d.last_location_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {showHospital && (
                        <select
                          className={`select ${
                            isSelectedHospitalFull
                              ? "border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-semibold"
                              : ""
                          }`}
                          value={selectedHospital}
                          onChange={async (e) => {
                            const value = e.target.value;
                            if (!value) return;

                            // STRICT CAPACITY GUARD: Cannot select hospital with 0 beds
                            const cap = getHospitalCapacity(value, r, hospitals);
                            if (cap === 0) {
                              const name = getHospitalName(value, r, hospitals);
                              setError(
                                `⛔ Cannot route to "${name}": Facility is at 0 available beds (Full / Diversion). Please select another hospital.`,
                              );
                              return;
                            }

                            setHospitalDraft((h) => ({
                              ...h,
                              [r.id]: value,
                            }));

                            setError(null);
                            const { error: err } = await supabase.rpc(
                              "assign_emergency_hospital",
                              {
                                p_request_id: r.id,
                                p_hospital_id: value,
                              },
                            );
                            if (err) setError(rpcMessage(err));
                            else router.refresh();
                          }}
                        >
                          <option value="">Select hospital</option>
                          {hospitals.map((h) => {
                            const cap = getHospitalCapacity(h.id, r, hospitals);
                            const isFull = cap === 0;
                            return (
                              <option
                                key={h.id}
                                value={h.id}
                                disabled={isFull}
                              >
                                {h.name}{" "}
                                {cap != null
                                  ? isFull
                                    ? "⛔ (0 beds - FULL)"
                                    : `(${cap} beds)`
                                  : ""}
                              </option>
                            );
                          })}
                        </select>
                      )}

                      {isSelectedHospitalFull && showHospital && (
                        <div className="p-2 rounded bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-900 text-[11px] text-red-800 dark:text-red-300 font-semibold">
                          ⛔ Assigned facility has 0 available beds. Select another hospital above to proceed.
                        </div>
                      )}

                      {showDriver && (
                        <select
                          className="select"
                          value={selectedDriver}
                          onChange={async (e) => {
                            const value = e.target.value;
                            setDriverDraft((d) => ({ ...d, [r.id]: value }));
                            if (!value) return;
                            setError(null);
                            const { error: err } = await supabase.rpc(
                              "assign_emergency_driver",
                              {
                                p_request_id: r.id,
                                p_driver_id: value,
                              },
                            );
                            if (err) setError(rpcMessage(err));
                            else router.refresh();
                          }}
                        >
                          <option value="">Select driver</option>
                          {drivers.length === 0 && (
                            <option value="" disabled>
                              No drivers available — check banner error or drivers table
                            </option>
                          )}
                          {sortDriversForAssign(drivers).map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.display_name || "Driver"}
                              {d.vehicle_label ? ` · ${d.vehicle_label}` : ""}
                              {` (${d.active === true ? "🟢 Active" : "⚪ Standby"})`}
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {targets.length === 0 && (
                          <span className="text-[12px] text-[var(--muted)]">
                            No legal transitions
                          </span>
                        )}
                        {targets.map((to) => {
                          const isHospAction = needsHospital(to);
                          const isBlocked = isHospAction && isSelectedHospitalFull;

                          return (
                            <button
                              key={to}
                              className={`btn ${
                                isBlocked
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-300 dark:border-red-800 cursor-not-allowed opacity-60 font-bold"
                                  : "btn-primary"
                              }`}
                              disabled={busyId === r.id || isBlocked}
                              onClick={() => transition(r, to)}
                              title={
                                isBlocked
                                  ? "Hospital has 0 beds available. Choose another facility."
                                  : ""
                              }
                            >
                              {isBlocked ? "⛔ Full (0 Beds)" : to}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Toast
        message={error}
        kind="error"
        onClose={() => setError(null)}
      />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </>
  );
}