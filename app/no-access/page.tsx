"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldAlert,
  Download,
  ArrowLeft,
  LogOut,
  Clock,
  Phone,
  Building2,
  FileCheck2,
} from "lucide-react";

export default function NoAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isStaffPending, setIsStaffPending] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    async function checkProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, chronic_conditions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setDisplayName(profile.display_name);
          if (
            profile.chronic_conditions &&
            profile.chronic_conditions.includes("[STAFF_APPLICATION_PENDING]")
          ) {
            setIsStaffPending(true);
          }
        }
      }
      setLoading(false);
    }

    checkProfile();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh grid place-items-center p-4 bg-[#040E26] text-slate-100">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#07193F] border border-white/10 space-y-6 shadow-2xl">
        {/* Brand Topmark */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-emerald-500/30 bg-[#040E26] p-0.5">
              <Image
                src="/solace_icon.png"
                alt="Solace EMS"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span className="font-bold text-xs tracking-wider text-white font-mono">
              SOLACE EMS
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
            ACCESS CONTROL
          </span>
        </div>

        {/* Header Badge */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              isStaffPending
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {isStaffPending ? (
              <Clock className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              {isStaffPending
                ? "Staff Credentialing In Review"
                : "Operational Console Notice"}
            </h1>
            <p className="text-xs text-slate-400">
              {isStaffPending
                ? "Verification in progress"
                : "Role-restricted emergency desk"}
            </p>
          </div>
        </div>

        {/* Dynamic Explanation */}
        {loading ? (
          <div className="py-4 text-center text-xs text-slate-400">
            Checking profile credentials...
          </div>
        ) : isStaffPending ? (
          <div className="text-xs text-slate-300 leading-relaxed space-y-3">
            <p>
              {displayName ? `Hello ${displayName}. ` : ""}Your application for{" "}
              <strong>Staff / Clinical Console Access</strong> has been
              registered and is currently undergoing administrative review.
            </p>
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/90 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Verification &amp; Governance Policy</span>
              </div>
              <p className="text-slate-400">
                In adherence to emergency medical protocols, dispatcher and
                clinical receiving bay privileges require facility verification
                before activation.
              </p>
            </div>
            <p className="text-[11px] text-slate-400">
              You will receive an alert once your facility administrator approves
              your profile. For expedited onboarding, reach our operations desk below.
            </p>
          </div>
        ) : (
          <div className="text-xs text-slate-300 leading-relaxed space-y-2.5">
            <p>
              {displayName ? `Hello ${displayName}, ` : ""}you are currently
              signed in with a <strong>Patient / Member</strong> profile.
            </p>
            <p className="text-slate-400">
              The Web Operations Consoles are reserved exclusively for certified emergency responders, ER clinical receiving bays, and network administrators.
            </p>
            <p className="text-slate-400">
              To request emergency transit or view live responder telematics,
              please open the <strong>Solace Android App</strong>.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2 border-t border-white/5">
          <Link
            href="/download"
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Solace Mobile App</span>
          </Link>

          <button
            className="w-full py-2.5 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            onClick={signOut}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Support & Return */}
        <div className="space-y-2 pt-1 text-center">
          <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Phone className="w-3 h-3 text-emerald-400" />
            <span>24/7 Operations Desk:</span>
            <a
              href="tel:+2348133355709"
              className="font-mono text-emerald-400 hover:underline"
            >
              +234 813 335 5709
            </a>
          </div>

          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Homepage</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
