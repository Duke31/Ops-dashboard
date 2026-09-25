"use client";

import { FormEvent, useState } from "react";
import type { Hospital, Profile } from "@/lib/types";
import { createStaffAccount } from "@/app/admin/staff/actions";
import { Toast } from "@/components/Toast";
import { useRouter } from "next/navigation";

export function StaffManager({
  staff,
  hospitals,
}: {
  staff: Profile[];
  hospitals: Pick<Hospital, "id" | "name">[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    role: "dispatcher" as "dispatcher" | "hospital" | "driver",
    hospital_id: "",
    vehicle_label: "",
  });

  const hospitalName = (id: string | null) =>
    hospitals.find((h) => h.id === id)?.name || "—";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const result = await createStaffAccount({
        email: form.email,
        password: form.password,
        role: form.role,
        display_name: form.display_name,
        hospital_id: form.hospital_id || null,
        vehicle_label: form.vehicle_label || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOk(`Account created (${result.user_id}).`);
      setForm({
        email: "",
        password: "",
        display_name: "",
        role: "dispatcher",
        hospital_id: "",
        vehicle_label: "",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card p-4 grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 text-sm font-semibold">
          Create staff account
        </div>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Temporary password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8}
          required
        />
        <input
          className="input"
          placeholder="Display name"
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          required
        />
        <select
          className="select"
          value={form.role}
          onChange={(e) =>
            setForm({
              ...form,
              role: e.target.value as "dispatcher" | "hospital" | "driver",
            })
          }
        >
          <option value="dispatcher">Dispatcher</option>
          <option value="hospital">Hospital desk</option>
          <option value="driver">Driver</option>
        </select>
        {(form.role === "hospital" || form.role === "driver") && (
          <select
            className="select"
            value={form.hospital_id}
            onChange={(e) => setForm({ ...form, hospital_id: e.target.value })}
            required
          >
            <option value="">Select hospital</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        )}
        {form.role === "driver" && (
          <input
            className="input"
            placeholder="Vehicle label / phone"
            value={form.vehicle_label}
            onChange={(e) =>
              setForm({ ...form, vehicle_label: e.target.value })
            }
            required
          />
        )}
        <div className="md:col-span-2">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Hospital</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.user_id}>
                <td>{s.display_name || "—"}</td>
                <td>{s.email || "—"}</td>
                <td className="capitalize">{s.role}</td>
                <td>{hospitalName(s.hospital_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Toast message={error} onClose={() => setError(null)} />
      <Toast message={ok} kind="ok" onClose={() => setOk(null)} />
    </div>
  );
}
