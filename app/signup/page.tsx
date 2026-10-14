"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  signupClientAction,
  signupStaffAction,
  type SignupActionState,
} from "./actions";
import {
  Ambulance,
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Phone,
  Mail,
  Lock,
  User,
  Heart,
  Clock,
  CheckCircle2,
  FileCheck2,
  Activity,
  ArrowLeft,
} from "lucide-react";

export default function SignupPage() {
  const [activeTab, setActiveTab] = useState<"client" | "staff">("client");

  // Client form state
  const [clientState, clientAction, clientPending] = useActionState<
    SignupActionState,
    FormData
  >(signupClientAction, null);

  // Staff form state
  const [staffState, staffAction, staffPending] = useActionState<
    SignupActionState,
    FormData
  >(signupStaffAction, null);

  return (
    <div className="min-h-dvh bg-[#040E26] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-black">
      <div className="max-w-xl w-full mx-auto space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Portal</span>
          </Link>

          <div className="flex items-center justify-center gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-lg shadow-emerald-500/20 border border-cyan-400/30 bg-[#061536] p-1 flex items-center justify-center">
              <Image
                src="/solace_icon.png"
                alt="Solace EMS Logo"
                width={38}
                height={38}
                className="object-contain rounded-lg"
                priority
              />
            </div>
            <div className="text-left">
              <span className="text-lg font-black tracking-tight text-white block">
                SOLACE EMS
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                Coordinated Emergency Response
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-2">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Select your account type to access rapid emergency transit services or register operational facility credentials.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#07193F] border border-white/10 gap-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => setActiveTab("client")}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "client"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Patient / Member</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "staff"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Staff &amp; Clinical Provider</span>
          </button>
        </div>

        {/* TAB 1: CLIENT SIGNUP */}
        {activeTab === "client" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#07193F] border border-white/10 shadow-2xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400 mb-2">
                <CheckCircle2 className="w-3 h-3" />
                <span>Instant Mobile Pairing</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Emergency Care &amp; Transit Membership
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Pre-load critical health telematics to expedite ambulance dispatch and hospital intake. After registration, download the Android APK to pair your mobile phone.
              </p>
            </div>

            {clientState?.error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Registration Alert</div>
                  <div className="mt-0.5">{clientState.error}</div>
                </div>
              </div>
            )}

            <form action={clientAction} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    name="full_name"
                    type="text"
                    required
                    placeholder="e.g. Samuel Adeleke"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="name@domain.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      name="phone"
                      type="tel"
                      required
                      placeholder="0801 234 5678"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                  />
                </div>
              </div>

              {/* Optional Health Telematics */}
              <div className="pt-2 border-t border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pre-Loaded Emergency Telematics (Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Blood Group
                    </label>
                    <select
                      name="blood_group"
                      defaultValue=""
                      className="w-full px-3 py-2 rounded-xl bg-[#040E26] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 transition"
                    >
                      <option value="">Select (Optional)</option>
                      <option value="O+">O Positive (O+)</option>
                      <option value="O-">O Negative (O-)</option>
                      <option value="A+">A Positive (A+)</option>
                      <option value="A-">A Negative (A-)</option>
                      <option value="B+">B Positive (B+)</option>
                      <option value="B-">B Negative (B-)</option>
                      <option value="AB+">AB Positive (AB+)</option>
                      <option value="AB-">AB Negative (AB-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Severe Allergies / Alerts
                    </label>
                    <input
                      name="allergies"
                      type="text"
                      placeholder="e.g. Penicillin, Aspirin"
                      className="w-full px-3 py-2 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-400 transition"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition">
                  <input
                    name="is_maternal_care"
                    type="checkbox"
                    className="mt-0.5 rounded border-white/20 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Heart className="w-3 h-3 text-rose-400" />
                      <span>Priority Maternal / Obstetric Care Enrollment</span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Routes dispatches directly to specialized facilities with active surgical theaters and neonatal teams.
                    </div>
                  </div>
                </label>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={clientPending}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-black text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {clientPending ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>CREATE ACCOUNT &amp; GET MOBILE APP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400 pt-1">
                Upon submitting, you will be directed to download the verified Solace Android APK to connect your phone.
              </p>
            </form>
          </div>
        )}

        {/* TAB 2: STAFF & PROVIDER CREDENTIALING */}
        {activeTab === "staff" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#07193F] border border-white/10 shadow-2xl space-y-6">
            {/* If staff registration has succeeded, show the In-Review State */}
            {staffState?.isStaffReview ? (
              <div className="space-y-6 py-2 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <Clock className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400 font-semibold">
                    <span>APPLICATION UNDER ADMINISTRATIVE REVIEW</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Credentialing Submitted
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Your provider registration has been forwarded to the Solace Operations Directorate. For clinical integrity and patient safety, operational consoles require verified administrator authorization before activation.
                  </p>
                </div>

                {/* Audit Record Summary */}
                <div className="p-4 rounded-2xl bg-[#040E26] border border-white/5 text-left text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-slate-400">Reference Tracking ID</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {staffState.referenceId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Requested Operational Desk</span>
                    <span className="font-semibold text-white">
                      {staffState.roleTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Healthcare Facility / Affiliation</span>
                    <span className="font-semibold text-slate-200">
                      {staffState.facilityName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                    <span className="text-slate-500">Governance Status</span>
                    <span className="text-amber-400 font-medium">Pending Facility Verification</span>
                  </div>
                </div>

                {/* Next Steps Guide */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left text-xs space-y-2 text-slate-300">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    <span>Next Steps for Provider Activation:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>Our Medical Directorate verifies facility credentials with the designated clinical administrator.</li>
                    <li>The administrator provisions your operational role in the Solace governance console.</li>
                    <li>You will receive an activation SMS and email once your desk privileges are unlocked.</li>
                  </ol>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition text-center"
                  >
                    Return to Homepage
                  </Link>
                  <Link
                    href="/download"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Ambulance className="w-3.5 h-3.5" />
                    <span>Download Responder APK</span>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-amber-400 mb-2">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Clinical Governance Review</span>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    Healthcare Facility &amp; Responder Desk Registration
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    For Emergency Dispatchers, Hospital ER Triage Staff, and Certified Ambulance Personnel. Registrations are reviewed by the medical directorate prior to console access.
                  </p>
                </div>

                {staffState?.error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Submission Notice</div>
                      <div className="mt-0.5">{staffState.error}</div>
                    </div>
                  </div>
                )}

                <form action={staffAction} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Full Legal &amp; Professional Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        name="full_name"
                        type="text"
                        required
                        placeholder="e.g. Dr. Kemi Adeleke / Paramedic T. Bello"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                      />
                    </div>
                  </div>

                  {/* Work Email & Direct Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Professional Work Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          name="email"
                          type="email"
                          required
                          placeholder="staff@facility.org"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Direct Phone / Hotline
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          name="phone"
                          type="tel"
                          required
                          placeholder="0802 345 6789"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operational Role Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Designated Operational Desk
                    </label>
                    <select
                      name="requested_role"
                      defaultValue="hospital"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 transition font-medium"
                    >
                      <option value="hospital">
                        Hospital ER Intake &amp; Acute Receiving Bay Desk
                      </option>
                      <option value="dispatcher">
                        Emergency Operations &amp; Mission Orchestration
                      </option>
                      <option value="driver">
                        Certified Field Emergency Crew &amp; Rapid Unit
                      </option>
                    </select>
                  </div>

                  {/* Facility Name & License/Badge ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Healthcare Facility / Organization
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          name="facility_name"
                          type="text"
                          required
                          placeholder="e.g. Apex Specialist Trauma Hospital"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Staff ID / Professional License (Optional)
                      </label>
                      <input
                        name="license_number"
                        type="text"
                        placeholder="e.g. MDCN/EMS-4481"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Password (Minimum 8 Characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        placeholder="Create a strong passphrase"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040E26] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 transition"
                      />
                    </div>
                  </div>

                  {/* Governance Notice */}
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Access to operational emergency consoles is protected by clinical oversight protocols. Upon submission, an administrator verifies credentials before activating console privileges.
                    </span>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={staffPending}
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-black text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {staffPending ? (
                        <span>Submitting Credentialing Application...</span>
                      ) : (
                        <>
                          <span>SUBMIT REGISTRATION FOR REVIEW</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Bottom Login Link & Helpdesk */}
        <div className="text-center space-y-3">
          <div className="text-xs text-slate-400">
            Already have an active account?{" "}
            <Link
              href="/login"
              className="text-white hover:text-emerald-400 font-bold underline transition-colors"
            >
              Sign In to Operational Desks
            </Link>
          </div>

          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-500">
            Immediate active life-threatening crisis? Call 24/7 Operations Desk:{" "}
            <a
              href="tel:+2348133355709"
              className="font-mono text-emerald-400 hover:underline font-bold"
            >
              +234 813 335 5709
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
