"use client";

import { useMemo, useState } from "react";
import type {
  AppRole,
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
  empty = "No active requests.",
}: {
  requests: EmergencyRequest[];
  rules: TransitionRule[];
  actorRole: AppRole;
  hospitals?: Pick<Hospital, "id" | "name">[];
  empty?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [driverDraft, setDriverDraft] = useState<
    Record<string, { name: string; phone: string }>
  >({});
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

    const draft = driverDraft[request.id] ?? { name: "", phone: "" };
    if (needsDriver(toStatus) && (!draft.name.trim() || !draft.phone.trim())) {
      setError("Enter driver name and phone before assigning a driver.");
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
        const { error: hospErr } = await supabase
          .from("emergency_requests")
          .update({ hospital_id: hospitalId })
          .eq("id", request.id);
        if (hospErr) throw hospErr;
      }

      if (needsDriver(toStatus)) {
        const label = `${draft.name.trim()} · ${draft.phone.trim()}`;
        const { data: driverRow, error: drvErr } = await supabase
          .from("drivers")
          .insert({
            display_name: draft.name.trim(),
            vehicle_label: draft.phone.trim(),
            hospital_id: request.hospital_id,
          })
          .select("id")
          .single();
        if (drvErr) throw drvErr;
        const { error: upErr } = await supabase
          .from("emergency_requests")
          .update({
            driver_id: driverRow.id,
            notes: request.notes
              ? `${request.notes}\nAssigned driver: ${label}`
              : `Assigned driver: ${label}`,
          })
          .eq("id", request.id);
        if (upErr) throw upErr;
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
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Transition failed.";
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
              const showDriver = targets.some(needsDriver);
              const showHospital = targets.some(needsHospital);
              const draft = driverDraft[r.id] ?? { name: "", phone: "" };
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
                          onChange={(e) =>
                            setHospitalDraft((h) => ({
                              ...h,
                              [r.id]: e.target.value,
                            }))
                          }
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
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            className="input"
                            placeholder="Driver name"
                            value={draft.name}
                            onChange={(e) =>
                              setDriverDraft((d) => ({
                                ...d,
                                [r.id]: { ...draft, name: e.target.value },
                              }))
                            }
                          />
                          <input
                            className="input"
                            placeholder="Phone"
                            value={draft.phone}
                            onChange={(e) =>
                              setDriverDraft((d) => ({
                                ...d,
                                [r.id]: { ...draft, phone: e.target.value },
                              }))
                            }
                          />
                        </div>
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
