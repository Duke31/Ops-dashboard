"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Download,
  CheckCircle2,
  AlertCircle,
  Phone,
  Lock,
  HeartPulse,
  Baby,
  Shield,
  Calendar,
  Building2,
  Droplets,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ClientRegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Care Plan Selection
  const [planType, setPlanType] = useState<"maternal" | "standard">("maternal");

  // Medical Profile Fields
  const [bloodGroup, setBloodGroup] = useState("O-Negative (Rare Blood Shield)");
  const [genotype, setGenotype] = useState("AA");
  const [allergies, setAllergies] = useState("");
  const [preferredHospital, setPreferredHospital] = useState(
    "UCH Private Wing & Emergency Centre (Ibadan)",
  );

  // Obstetric Specific Fields
  const [gestationalWeeks, setGestationalWeeks] = useState(32);
  const [edd, setEdd] = useState("2026-12-15");
  const [gravidaPara, setGravidaPara] = useState("G2P1");

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

      const isMaternal = planType === "maternal";

      // 1. Register with Supabase Auth including profile metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            profile_type: planType,
            is_pregnant: isMaternal,
            gestational_weeks: isMaternal ? gestationalWeeks : 0,
            edd: isMaternal ? edd : "",
            gravida_para: isMaternal ? gravidaPara : "",
            blood_group: bloodGroup,
            genotype: genotype,
            allergies: allergies.trim() || "None reported",
            preferred_hospital: preferredHospital,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      const user = authData.user;
      if (user) {
        // 2. Upsert profile as client with medical baseline
        try {
          await supabase.from("profiles").upsert(
            {
              user_id: user.id,
              display_name: cleanName,
              full_name: cleanName,
              phone: cleanPhone || null,
              role: "client",
              blood_group: bloodGroup,
              allergies: allergies.trim() || null,
            },
            { onConflict: "user_id" },
          );
        } catch {
          // Profile trigger or RLS may handle
        }
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(
        (err instanceof Error ? err.message : String(err)) ||
          "Registration failed. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="max-w-xl w-full mx-auto space-y-6">
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
              <span>Tailored Patient &amp; Family Registration</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Create Solace Account</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your profile customizes your mobile experience. Obstetric members receive gestational
              timelines and L&amp;D pre-alerts; standard members receive rapid general emergency
              coverage.
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
                  Your profile has been saved as{" "}
                  <strong className="text-emerald-400">
                    {planType === "maternal" ? "Maternal & Obstetric Care" : "Standard Emergency"}
                  </strong>
                  . Your mobile dashboard is now customized to your exact clinical needs.
                </p>
              </div>
              <div className="pt-3 space-y-2">
                <a
                  href="/solace-client.apk"
                  download="solace-client.apk"
                  className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/25 transition-all gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Solace Patient APK →</span>
                </a>
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all gap-2"
                >
                  <span>View Installation Guide &amp; App Details →</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
              )}

              {/* 1. CARE PLAN / PROFILE TYPE SELECTION */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select Your Plan &amp; Dashboard View
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlanType("maternal")}
                    className={`p-3.5 rounded-2xl border text-left transition relative ${
                      planType === "maternal"
                        ? "bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500"
                        : "bg-[#121622] border-white/10 hover:border-white/20 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Baby className="w-4 h-4" />
                      </div>
                      {planType === "maternal" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white">Maternal &amp; Obstetric Care</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      For expectant mothers: Gestational timeline, kick counter, baby development &amp;
                      L&amp;D theater pre-alerts.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanType("standard")}
                    className={`p-3.5 rounded-2xl border text-left transition relative ${
                      planType === "standard"
                        ? "bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500"
                        : "bg-[#121622] border-white/10 hover:border-white/20 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <Shield className="w-4 h-4" />
                      </div>
                      {planType === "standard" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white">Standard Emergency Shield</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      For individuals &amp; families: 24/7 rapid ambulance dispatch, VIP bedside
                      admissions &amp; trauma response.
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. BASIC CREDENTIALS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Amina Adeleke"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
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
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
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
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* 3. DYNAMIC PROFILE FIELDS: OBSTETRIC vs STANDARD */}
              {planType === "maternal" ? (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                    <Baby className="w-4 h-4 text-purple-400" />
                    <span>Obstetric &amp; Pregnancy Parameters</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        Current Gestational Age
                      </label>
                      <select
                        value={gestationalWeeks}
                        onChange={(e) => setGestationalWeeks(parseInt(e.target.value) || 32)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      >
                        {Array.from({ length: 39 }, (_, i) => i + 4).map((w) => (
                          <option key={w} value={w}>
                            Week {w} ({w >= 28 ? "3rd Trimester" : w >= 13 ? "2nd Trimester" : "1st Trimester"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        Estimated Due Date (EDD)
                      </label>
                      <input
                        type="date"
                        value={edd}
                        onChange={(e) => setEdd(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        Gravida / Parity
                      </label>
                      <input
                        type="text"
                        value={gravidaPara}
                        onChange={(e) => setGravidaPara(e.target.value)}
                        placeholder="e.g. G2P1 or G1P0"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span>Emergency Health Baseline</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                      Known Allergies or Medical Conditions (Optional)
                    </label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Penicillin allergy, Asthma, Hypertension"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              )}

              {/* 4. CLINICAL SAFETY (BLOOD GROUP & HOSPITAL) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="O-Negative (Rare Blood Shield)">O-Negative (Rare Blood Shield)</option>
                    <option value="O-Positive">O-Positive</option>
                    <option value="A-Positive">A-Positive</option>
                    <option value="A-Negative">A-Negative</option>
                    <option value="B-Positive">B-Positive</option>
                    <option value="B-Negative">B-Negative</option>
                    <option value="AB-Positive">AB-Positive</option>
                    <option value="AB-Negative">AB-Negative</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Genotype
                  </label>
                  <select
                    value={genotype}
                    onChange={(e) => setGenotype(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="AA">AA (Normal)</option>
                    <option value="AS">AS (Sickle Trait)</option>
                    <option value="AC">AC</option>
                    <option value="SS">SS (Sickle Cell Disease)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Preferred Healthcare / Maternity Center
                </label>
                <select
                  value={preferredHospital}
                  onChange={(e) => setPreferredHospital(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#121622] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="UCH Private Wing & Emergency Centre (Ibadan)">
                    UCH Private Wing &amp; Emergency Centre (Ibadan)
                  </option>
                  <option value="LifeCare Hospital & Surgical Centre (Ibadan)">
                    LifeCare Hospital &amp; Surgical Centre (Ibadan)
                  </option>
                  <option value="Jid-Mek Specialist Hospital (Bodija, Ibadan)">
                    Jid-Mek Specialist Hospital (Bodija, Ibadan)
                  </option>
                  <option value="State Specialist Hospital Asubiaro (Osun OSEMSAS)">
                    State Specialist Hospital Asubiaro (Osun OSEMSAS)
                  </option>
                  <option value="UNIOSUN Teaching Hospital (Osogbo)">
                    UNIOSUN Teaching Hospital (Osogbo)
                  </option>
                  <option value="Mainland General Hospital (Lagos)">
                    Mainland General Hospital (Lagos)
                  </option>
                  <option value="Lekki Emergency Centre (Lagos)">
                    Lekki Emergency Centre (Lagos)
                  </option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {loading
                      ? "Configuring Personalized Profile…"
                      : `Register as ${planType === "maternal" ? "Obstetric Member" : "Standard Member"}`}
                  </span>
                </button>
              </div>

              <div className="text-center pt-1 text-xs text-slate-400">
                Already registered?{" "}
                <Link href="/login" className="text-emerald-400 hover:underline font-semibold">
                  Sign In to Your Dashboard
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
