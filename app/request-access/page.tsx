"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type HospitalOption = {
  id: string;
  name: string;
};

export default function RequestAccessPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<"dispatcher" | "hospital" | "driver">("dispatcher");
  const [hospitalId, setHospitalId] = useState("");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [notes, setNotes] = useState("");

  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("hospitals")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setHospitals(data);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Check if user already exists or sign up via Supabase Auth
      let userId: string | null = null;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: fullName.trim(),
          },
        },
      });

      if (authError) {
        // If user already registered, attempt to authenticate them so we have auth.uid()
        if (authError.message.toLowerCase().includes("already registered")) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });
          if (signInError) {
            throw new Error(
              "An account with this email exists. Please enter the correct password to submit your staff access request.",
            );
          }
          userId = signInData.user?.id ?? null;
        } else {
          throw authError;
        }
      } else {
        userId = authData.user?.id ?? null;
      }

      if (!userId) {
        throw new Error("Unable to create user identity. Please verify your details.");
      }

      // 2. Insert into role_requests
      const { error: insertError } = await supabase.from("role_requests").insert({
        user_id: userId,
        display_name: fullName.trim(),
        requested_role: requestedRole,
        hospital_id: requestedRole === "hospital" ? (hospitalId || null) : null,
        vehicle_label: requestedRole === "driver" ? (vehicleLabel.trim() || null) : null,
        notes: notes.trim() || null,
        status: "pending",
      });

      if (insertError) {
        throw insertError;
      }

      // 3. Sign out temporary auth session to maintain strict security
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Staff Sign In</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-[#0D111A] border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/solace_icon.png"
              alt="Solace EMS Logo"
              className="w-12 h-12 rounded-xl mx-auto shadow-md object-contain border border-white/10"
            />
            <h1 className="text-2xl font-black text-white tracking-tight">Request Staff Access</h1>
            <p className="text-xs text-slate-400">
              Submit your credential application for Central Dispatcher, Hospital Receiving, or Ambulance Fleet approval.
            </p>
          </div>

          {success ? (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white">Application Submitted</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your request has been placed in the pending review queue. A Solace network administrator will verify your credentials and assign your operational permissions.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition"
                >
                  Return to Portal Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name &amp; Title
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. John Doe or Dispatcher Sarah"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Work / Official Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Create Portal Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Requested Role
                </label>
                <select
                  value={requestedRole}
                  onChange={(e) => setRequestedRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="dispatcher">Central Dispatcher Desk</option>
                  <option value="hospital">Hospital Receiving Desk</option>
                  <option value="driver">Ambulance Fleet Driver</option>
                </select>
              </div>

              {requestedRole === "hospital" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Affiliated Hospital Facility
                  </label>
                  <select
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">Select hospital facility...</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {requestedRole === "driver" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Ambulance Vehicle Call-Sign / Plate
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleLabel}
                    onChange={(e) => setVehicleLabel(e.target.value)}
                    placeholder="e.g. Unit-04 / ALS-Van"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Clinical / Operational Verification Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide your department, supervisor reference, or medical license details..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Submitting Application…" : "Submit Access Request"}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  All staff requests are subject to administrator verification. Access is provisioned strictly through manual review.
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
