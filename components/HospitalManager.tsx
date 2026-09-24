"use client";

import { FormEvent, useState } from "react";
import type { Hospital } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";

export function HospitalManager({ hospitals }: { hospitals: Hospital[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    available_capacity: 0,
  });
  const [editing, setEditing] = useState<Hospital | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: err } = await supabase.from("hospitals").insert({
      name: form.name,
      address: form.address || null,
      available_capacity: form.available_capacity,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ name: "", address: "", available_capacity: 0 });
    router.refresh();
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const { error: err } = await supabase
      .from("hospitals")
      .update({
        name: editing.name,
        address: editing.address,
        available_capacity: editing.available_capacity,
      })
      .eq("id", editing.id);
    if (err) {
      setError(err.message);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="card p-4 grid md:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <input
          className="input"
          type="number"
          min={0}
          placeholder="Capacity"
          value={form.available_capacity}
          onChange={(e) =>
            setForm({ ...form, available_capacity: Number(e.target.value) })
          }
        />
        <button className="btn btn-primary">Add hospital</button>
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Capacity</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {hospitals.map((h) => (
              <tr key={h.id}>
                <td className="font-medium">{h.name}</td>
                <td>{h.address || "—"}</td>
                <td>{h.available_capacity ?? "—"}</td>
                <td>
                  <button className="btn btn-ghost" onClick={() => setEditing(h)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <form onSubmit={onSaveEdit} className="card p-4 space-y-3">
          <div className="text-sm font-semibold">Edit {editing.name}</div>
          <input
            className="input"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
          <input
            className="input"
            value={editing.address ?? ""}
            onChange={(e) =>
              setEditing({ ...editing, address: e.target.value })
            }
          />
          <input
            className="input"
            type="number"
            value={editing.available_capacity ?? 0}
            onChange={(e) =>
              setEditing({
                ...editing,
                available_capacity: Number(e.target.value),
              })
            }
          />
          <div className="flex gap-2">
            <button className="btn btn-primary">Save</button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <Toast message={error} onClose={() => setError(null)} />
    </div>
  );
}
