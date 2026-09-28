"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

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

  // Keep state in sync if value prop changes
  useEffect(() => {
    if (value != null) setCap(value);
  }, [value]);

  async function adjust(delta: number) {
    const nextVal = Math.max(0, cap + delta);
    setCap(nextVal);
    await saveValue(nextVal);
  }

  async function saveValue(targetCapacity: number) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("hospitals")
      .update({ available_capacity: targetCapacity })
      .eq("id", hospitalId);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg(`Available beds updated to ${targetCapacity}.`);
    router.refresh();
  }

  return (
    <div className="card p-5 border shadow-sm" style={{ borderColor: 'var(--line)' }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Live Facility Bed Availability
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="text-3xl font-extrabold tracking-tight"
              style={{
                color: cap === 0 ? '#dc2626' : cap <= 2 ? '#d97706' : '#059669'
              }}
            >
              {cap}
            </span>
            <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              {cap === 1 ? "bed available" : "beds available"}
            </span>
            {cap === 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                ⚠️ Full / Diversion Mode
              </span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Dispatchers immediately see this live count before routing ambulances.
          </p>
        </div>

        {/* Quick Increment / Decrement Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost px-3 py-1.5 text-base font-bold"
            disabled={busy || cap <= 0}
            onClick={() => adjust(-1)}
            title="Minus 1 Bed"
          >
            − 1
          </button>
          <button
            type="button"
            className="btn btn-ghost px-3 py-1.5 text-base font-bold"
            disabled={busy}
            onClick={() => adjust(1)}
            title="Plus 1 Bed"
          >
            + 1
          </button>
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-xs font-bold"
            disabled={busy}
            onClick={() => saveValue(cap)}
          >
            {busy ? "Saving…" : "Save Live Beds"}
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 flex items-center gap-4" style={{ borderTop: '1px solid var(--line)' }}>
        <input
          type="range"
          min={0}
          max={40}
          value={cap}
          onChange={(e) => setCap(Number(e.target.value))}
          onMouseUp={() => saveValue(cap)}
          onTouchEnd={() => saveValue(cap)}
          className="flex-1 cursor-pointer accent-emerald-600"
        />
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            className="input w-20 text-center font-bold text-sm"
            min={0}
            max={999}
            value={cap}
            onChange={(e) => setCap(Number(e.target.value))}
            onBlur={() => saveValue(cap)}
          />
          <span className="text-xs" style={{ color: 'var(--muted)' }}>beds</span>
        </div>
      </div>

      <Toast message={err} onClose={() => setErr(null)} />
      <Toast message={msg} kind="ok" onClose={() => setMsg(null)} />
    </div>
  );
}
