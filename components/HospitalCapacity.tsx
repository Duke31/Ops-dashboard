"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateHospitalCapacityAction } from "@/app/hospital/actions";

export function HospitalCapacity({
  hospitalId,
  value,
}: {
  hospitalId: string;
  value: number | null;
}) {
  const [cap, setCap] = useState(value ?? 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCap(value ?? 0);
  }, [value]);

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);

    const res = await updateHospitalCapacityAction(hospitalId, cap);
    setBusy(false);

    if (!res.ok) {
      setErr(res.error || "Failed to update bed capacity.");
      return;
    }
    setMsg("Hospital ER bed capacity updated.");
    router.refresh();
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Live ER Bed Capacity
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                cap === 0
                  ? "bg-red-500/10 text-red-600 border border-red-500/20"
                  : cap < 3
                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              }`}
            >
              {cap === 0 ? "⚠️ DIVERSION / NO BEDS" : `${cap} Beds Available`}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={50}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
              className="flex-1 accent-emerald-600 cursor-pointer"
            />
            <input
              type="number"
              className="input w-20 text-center font-bold text-sm"
              min={0}
              value={cap}
              onChange={(e) => setCap(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>

        <button
          className="btn btn-primary bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2"
          disabled={busy}
          onClick={save}
        >
          {busy ? "Saving…" : "Update Bed Count"}
        </button>
      </div>

      {err && (
        <div className="p-2 text-xs rounded bg-red-500/10 text-red-600 border border-red-500/20">
          {err}
        </div>
      )}
      {msg && (
        <div className="p-2 text-xs rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          {msg}
        </div>
      )}
    </div>
  );
}

export default HospitalCapacity;