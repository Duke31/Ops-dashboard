"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Download, CheckCircle2, AlertCircle, Phone, Lock, HeartPulse, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ClientRegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const cleanEmail = email.trim();
      const cleanPhone = phone.trim();
      const cleanName = fullName.trim();

      // 1. Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      const user = authData.user;
      if (user) {
        // 2. Upsert profile as client
        try {
          await supabase.from("profiles").upsert(
            {
              user_id: user.id,
              display_name: cleanName,
              full_name: cleanName,
              phone: cleanPhone || null,
              role: "client",
            },
            { onConflict: "user_id" },
          );
        } catch {
          // Profile trigger or RLS may handle or ignore
        }
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Solace EMS Overview</span>
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <HeartPulse className="w-3 h-3" />
              <span>Patient &amp; Family Registration</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Create Solace Account</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Register with your basic details to link your profile, then download the Android mobile app for one-touch SOS triggers and live ambulance tracking.
            </p>
          </div>

          {success ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-white">Account Created Successfully!</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your basic patient profile is registered. Download the Solace mobile app to sign in, complete your medical emergency contact details, and activate emergency dispatch.
                </p>
              </div>
              <div className="pt-3 space-y-2">
                <a
                  href="/solace-client.apk"
                  download="solace-client.apk"
                  className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/25 transition-all gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Solace Patient APK</span>
                </a>
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center w-full py-2 px-3 text-xs text-slate-400 hover:text-white transition"
                >
                  <span>View Installation Guide →</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Adebayo Ogunlesi"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0801 234 5678"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{loading ? "Creating Account…" : "Register & Get App"}</span>
                </button>
              </div>

              <div className="text-center pt-1 text-xs text-slate-400">
                Already have an account?{" "}
                <Link href="/download" className="text-emerald-400 hover:underline font-semibold">
                  Download App Directly
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
