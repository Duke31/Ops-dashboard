"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { rpcMessage } from "@/lib/rpc-error";
import { timeSince } from "@/lib/format";

export type RoleRequestRow = {
  id: string;
  requested_role: string | null;
  display_name: string | null;
  hospital_id: string | null;
  vehicle_label: string | null;
  notes: string | null;
  created_at: string;
  hospital?: { name: string } | null;
};

export function RoleRequests({ rows }: { rows: RoleRequestRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  async function review(id: string, approve: boolean) {
    setError(null);
    setOk(null);
    setBusy(id);
    try {
      const { error: err } = await supabase.rpc("admin_review_role_request", {
        p_request_id: id,
        p_approve: approve,
        p_reviewer_notes: notes[id]?.trim() || null,
      });
      if (err) throw err;
      setHidden((h) => ({ ...h, [id]: true }));
      setOk(approve ? "Request approved." : "Request rejected.");
      router.refresh();
    } catch (e) {
      setError(rpcMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const visible = rows.filter((r) => !hidden[r.id]);

  return (
    <div className="space-y-3">
      {visible.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No pending role requests.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Role</th>
                <th>Name</th>
                <th>Hospital</th>
                <th>Vehicle</th>
                <th>Notes</th>
                <th>Opened</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="capitalize">{r.requested_role || "—"}</td>
                  <td className="font-medium">{r.display_name || "—"}</td>
                  <td>{r.hospital?.name || "—"}</td>
                  <td>{r.vehicle_label || "—"}</td>
                  <td className="max-w-[160px] text-[12px]">{r.notes || "—"}</td>
                  <td className="whitespace-nowrap text-[var(--muted)]">
                    {timeSince(r.created_at)}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1 min-w-[160px]">
                      <input
                        className="input"
                        placeholder="Reviewer notes (optional)"
                        value={notes[r.id] ?? ""}
                        onChange={(e) =>
                          setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                        }
                      />
                      <div className="flex gap-1">
                        <button
                          className="btn btn-primary"
                          disabled={busy === r.id}
                          onClick={() => review(r.id, true)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-ghost"
                          disabled={busy === r.id}
                          onClick={() => review(r.id, false)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </div>
  );
}
