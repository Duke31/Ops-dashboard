"use client";

import type { Hospital, Profile } from "@/lib/types";

export function StaffManager({
  staff,
  hospitals,
}: {
  staff: Profile[];
  hospitals: Pick<Hospital, "id" | "name">[];
}) {
  const hospitalName = (id: string | null) =>
    hospitals.find((h) => h.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="card p-4 border-dashed">
        <div className="text-sm font-semibold">Create account — pending confirmation</div>
        <p className="text-sm text-[var(--muted)] mt-2 leading-6">
          Proposed implementation (not written): a Next.js server action
          <code className="mx-1 text-xs">createStaffAccount</code>
          that uses <code className="mx-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          to call <code className="mx-1 text-xs">auth.admin.createUser</code>, then
          inserts/updates <code className="mx-1 text-xs">profiles</code> with{" "}
          <code className="mx-1 text-xs">role</code> and optional{" "}
          <code className="mx-1 text-xs">hospital_id</code>. Alternative: a
          Supabase Edge Function with the same service-role client.
          Neither path will ship until you confirm which you want, and provide
          the service role key only via server env.
        </p>
      </div>

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
    </div>
  );
}
