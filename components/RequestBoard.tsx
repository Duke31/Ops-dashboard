"use client";

import { useMemo, useState } from "react";
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

function needsHospital(toStatus: string) {
  const s = toStatus.toLowerCase();
  return s.includes("hospital confirmed") || s.includes("hospital matched");
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
  hospitals?: Pick<Hospital, "id" | "name">[];
  drivers?: Pick<Driver, "id" | "display_name" | "vehicle_label" | "hospital_id" | "active">[];
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

  async function transition(
    request: EmergencyRequest,
    toStatus: string,
  ) {
    setError(null);
    setOk(null);

    const selectedDriver = driverDraft[request.id] || request.driver_id || "";
    if (needsDriver(toStatus) && !selectedDriver) {
      setError("Select an active driver before Driver assigned.");
      return;
    }

    const hospitalId =
      hospitalDraft[request.id] || request.hospital_id || "";
    if (needsHospital(toStatus) && !hospitalId) {
      setError("Select a hospital before confirming.");
      return;
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
              const showDriver = targets.some(needsDriver) && !r.driver_id;
              const showHospital = targets.some(needsHospital);
              const showDriver = targets.some(needsDriver);
              const selectedDriver = driverDraft[r.id] ?? r.driver_id ?? "";
              const selectedHospital =
                hospitalDraft[r.id] ?? r.hospital_id ?? "";
              return (
                <tr key={r.id}>
                  <td className="font-medium max-w-[220px]">
                    {formatLocation(r)}
                  </td>
                  <td>{r.emergency_type || "—"}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap text-[var(--muted)]">
                    {timeSince(r.created_at)}
                  </td>
                  <td>{r.hospital?.name || "—"}</td>
                  <td className="text-[12px]">
                    {r.driver?.display_name ? (
                      <>
                        <div className="font-medium">{r.driver.display_name}</div>
                        <div className="text-[var(--muted)]">
                          {r.driver.vehicle_label}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {showHospital && (
                        <select
                          className="select"
                          value={selectedHospital}
                          onChange={async (e) => {
                            const value = e.target.value;
                            setHospitalDraft((h) => ({
                              ...h,
                              [r.id]: value,
                            }));
                            if (!value) return;
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
                          {hospitals.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
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
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.display_name || "Driver"}
                              {d.vehicle_label ? ` · ${d.vehicle_label}` : ""}
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
                        {targets.map((to) => (
                          <button
                            key={to}
                            className="btn btn-primary"
                            disabled={busyId === r.id}
                            onClick={() => transition(r, to)}
                          >
                            {to}
                          </button>
                        ))}
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
