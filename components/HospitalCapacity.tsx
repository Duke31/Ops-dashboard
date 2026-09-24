"use client";

import { useState } from "react";
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

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("hospitals")
      .update({ available_capacity: cap })
      .eq("id", hospitalId);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Capacity updated.");
    router.refresh();
  }

  return (
    <div className="card p-4 flex flex-wrap items-end gap-4">
      <div className="flex-1 min-w-[240px]">
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Available capacity
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={50}
            value={cap}
            onChange={(e) => setCap(Number(e.target.value))}
            className="flex-1"
          />
          <input
            type="number"
            className="input w-20"
            min={0}
            value={cap}
            onChange={(e) => setCap(Number(e.target.value))}
          />
        </div>
      </div>
      <button className="btn btn-primary" disabled={busy} onClick={save}>
        Save capacity
      </button>
      <Toast message={err} onClose={() => setErr(null)} />
      <Toast message={msg} kind="ok" onClose={() => setMsg(null)} />
    </div>
  );
}
