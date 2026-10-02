"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Hospital } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/Toast";
import { rpcMessage } from "@/lib/rpc-error";

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

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card p-4 grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 text-sm font-semibold">
          {form.id ? "Edit hospital" : "New hospital"}
        </div>
        <input
          className="input"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Intake phone"
          value={form.intake_phone}
          onChange={(e) => setForm({ ...form, intake_phone: e.target.value })}
        />
        <input
          className="input md:col-span-2"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <input
          className="input"
          placeholder="Latitude"
          inputMode="decimal"
          value={form.lat}
          onChange={(e) => setForm({ ...form, lat: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Longitude"
          inputMode="decimal"
          value={form.lng}
          onChange={(e) => setForm({ ...form, lng: e.target.value })}
          required
        />
        <div className="md:col-span-2 flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : form.id ? "Save hospital" : "Add hospital"}
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

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Lat / lng</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-[var(--muted)]">
                  No hospitals yet.
                </td>
              </tr>
            )}
            {rows.map((h) => (
              <tr key={h.id}>
                <td className="font-medium">{h.name}</td>
                <td>{h.address || "—"}</td>
                <td>
                  {(h as Hospital & { intake_phone?: string }).intake_phone ||
                    "—"}
                </td>
                <td className="whitespace-nowrap text-[var(--muted)]">
                  {h.lat != null && h.lng != null
                    ? `${h.lat}, ${h.lng}`
                    : "—"}
                </td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => fill(h)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => onDelete(h)}>
                      Delete
                    </button>
                  </div>
                </td>
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
