import { createClient } from "@/lib/supabase/server";
import { ClientMobileApp } from "@/components/ClientMobileApp";
import Link from "next/link";
import { ArrowLeft, UserCheck } from "lucide-react";

export const metadata = {
  title: "Solace Mobile Client Hub | Maternal & Emergency Shield",
  description:
    "Mobile client application for Solace EMS members with profile-tailored dashboard views for obstetric and standard emergency patients.",
};

export default async function ClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialProfile = null;

  if (user) {
    const meta = user.user_metadata || {};
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const isObstetric =
      meta.is_pregnant === true ||
      meta.profile_type === "maternal" ||
      (meta.is_pregnant === undefined && meta.profile_type === undefined ? true : false);

    initialProfile = {
      fullName: meta.full_name || dbProfile?.full_name || dbProfile?.display_name || user.email?.split("@")[0] || "Mrs Foluke",
      phone: meta.phone || dbProfile?.phone || "+234 800 SOLACE",
      bloodGroup: meta.blood_group || dbProfile?.blood_group || "O-Negative (Rh-Negative)",
      genotype: meta.genotype || "AA",
      allergies: meta.allergies || dbProfile?.allergies || "None reported",
      preferredHospital: meta.preferred_hospital || "LifeCare Private Clinic (Ring Road, Ibadan)",
      preferredHospitalId: undefined,
      isObstetric: isObstetric,
      gestationalWeeks: meta.gestational_weeks || 31,
      gestationalDays: 1,
      edd: meta.edd || "2026-12-15",
      gravidaPara: meta.gravida_para || "G2P1 (Gravida 2, Para 1)",
      knownRisks: meta.known_risks || (isObstetric ? ["Previous C-Section"] : []),
      fetalKicksToday: 8,
      lastKickTime: "12:45 PM",
      dailySupplementsTaken: true,
      waterLiters: 1.8,
      sleepHours: 7.5,
      todayMood: "good" as const,
      nextOfKin: "Mr Babatunde Foluke (Husband)",
      nextOfKinPhone: "+234 802 333 4455",
    };
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/solace_icon.png"
              alt="Solace Logo"
              className="w-6 h-6 rounded-lg object-contain"
            />
            <span className="text-xs font-black tracking-wider text-cyan-400 uppercase">
              Solace Mobile Client
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 hidden md:flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Profile:{" "}
                  <strong className="text-white">
                    {initialProfile?.isObstetric ? "Maternal & Obstetric Care" : "Standard Emergency Shield"}
                  </strong>
                </span>
              </span>
              <Link
                href="/login"
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px]"
              >
                Ops Portal →
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Interactive Preview
              </span>
              <Link
                href="/register"
                className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] transition"
              >
                Sign Up Tailored Profile
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        <ClientMobileApp
          currentUserId={user?.id || null}
          userEmail={user?.email || null}
          initialProfile={initialProfile}
          isRegisteredUser={!!user}
        />
      </main>
    </div>
  );
}
