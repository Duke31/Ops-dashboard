import Link from "next/link";
import {
  Ambulance,
  Building2,
  ShieldCheck,
  Download,
  ArrowRight,
  Clock,
  Activity,
  CheckCircle2,
  PhoneCall,
  HeartPulse,
  Navigation,
  FileCheck2,
  Lock,
  Baby,
  UserPlus,
} from "lucide-react";

export default function MarketingLandingPage() {
  return (
    <div className="space-y-20 sm:space-y-28 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 sm:pt-20 lg:pt-24 overflow-hidden">
        {/* Subtle radial medical aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-[#00D4FF]/5 to-transparent blur-3xl -z-10"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Coordinated Emergency Dispatch &amp; Ambulance Telematics</span>
            </div>

            {/* Clear, calm medical value proposition */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
              Emergency Medical Response When{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-[#00D4FF]">
                Minutes Save Lives.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
              Solace connects patients, emergency vehicles, and receiving hospitals into one synchronized network. Real-time fleet tracking, specialized obstetric transit, priority intake pre-alerts, and seamless clinical handovers.
            </p>

            {/* Public Action CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5 group"
              >
                <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Sign Up as Patient / Client</span>
              </Link>

              <Link
                href="/download"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#11141E] hover:bg-[#161B28] text-slate-200 hover:text-white font-bold text-sm border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download Mobile App</span>
              </Link>
            </div>

            {/* Reassuring Clinical Standards */}
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-400 pt-3">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                GPS-Guided Nearest Unit Routing
              </span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Advance Emergency Department Alerts
              </span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Audited Clinical Handovers
              </span>
            </div>
          </div>

          {/* Clinical Highlights Grid */}
          <div className="mt-14 sm:mt-18 pt-10 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                Rapid Routing
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Optimized Transit Corridors
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Ambulance telematics bypass urban congestion to reduce pre-hospital delay.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#00D4FF]">
                Hospital Pre-Alert
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Emergency Intake Preparation
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Receiving trauma bays and maternity suites prepare equipment before patient dock.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-teal-400">
                Zero Redirection
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Capacity-Verified Admissions
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Patients are routed only to facilities with verified staff and bed availability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (Short, clear 4-step lifecycle) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="space-y-3 mb-12 text-center max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-[#00D4FF] font-mono">
            Emergency Lifecycle
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            How Solace Coordinates Care
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            From the moment an emergency call is initiated to bed admission, every phase is tracked and coordinated in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-white">Emergency Request</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Patient or bystander initiates a request via the mobile app or helpline. Location coordinates and medical category are captured instantly.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-white">Unit Dispatch</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The closest active ambulance is dispatched. Responders receive turn-by-turn navigation directly to the patient&apos;s exact coordinates.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-white">Hospital Pre-Alert</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The receiving emergency department receives incoming patient vitals, ETA countdown, and bed allocation requests while transit is underway.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm">
              04
            </div>
            <h3 className="text-base font-bold text-white">Direct Clinical Intake</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upon arrival, paramedics transfer the patient into the prepared trauma bay with a synchronized digital clinical handover sign-off.
            </p>
          </div>
        </div>
      </section>

      {/* 3. WHO IT'S FOR (Public / Hospitals / Certified Responders) */}
      <section id="who-its-for" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="space-y-3 mb-12 text-center max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
            Network Stakeholders
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Built for Everyone in the Emergency Chain
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Eliminating communication silos between citizens in distress, field responders, and hospital clinical teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Public & Patients */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D111A] border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Patients &amp; Families</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                One-tap emergency trigger, live radar view of the incoming ambulance, direct responder phone contact, and verified destination guidance.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:underline"
              >
                <span>Register Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/download"
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
              >
                <span>Get App →</span>
              </Link>
            </div>
          </div>

          {/* Hospitals */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D111A] border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Partner Hospitals</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Emergency departments maintain live bed capacity, receive audible pre-arrival chimes, review patient triage details, and confirm admissions.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-[#00D4FF] font-bold hover:underline"
              >
                <span>Hospital Staff Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Responders */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D111A] border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <Ambulance className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Ambulance Fleet</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Field drivers receive assigned mission calls, rapid turn-by-turn routing to the patient, and direct route navigation to the confirmed hospital bed.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 text-xs text-slate-500 font-medium">
              Equipped with real-time telematics &amp; direct receiving routing
            </div>
          </div>
        </div>
      </section>

      {/* 4. SPECIALIZED OBSTETRIC CARE NETWORK */}
      <section id="obstetric-care" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-b from-[#161B26] to-[#0D111A] border border-rose-500/30 p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          {/* Subtle warm glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -bottom-20 w-96 h-96 bg-rose-500/10 blur-3xl -z-10 rounded-full"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                <Baby className="w-3.5 h-3.5 text-rose-400" />
                <span>Specialized Obstetric Care Network</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Eliminating Maternal Delays in Southwestern Nigeria
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                The three delays in maternal health—delay in seeking care, delay in reaching a health facility, and delay in receiving adequate emergency obstetric care—remain the greatest threat to mother and newborn survival. Solace operates a dedicated pre-hospital corridor for expectant mothers.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300">
                    <strong className="text-white">Facility Capacity Verification:</strong> Mothers in labor are never routed to hospitals with locked surgical wards or unavailable anesthesia.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300">
                    <strong className="text-white">Antenatal Medical ID Pre-load:</strong> Blood group, parity, known gestation age, and pre-existing eclampsia risks sync instantly to the ambulance tablet.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-300">
                    <strong className="text-white">Neonatal Intensive Care Readiness:</strong> Advance ER alerts trigger newborn resuscitation equipment and warmer setup prior to ambulance dock.
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-rose-500/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register for Maternal Coverage</span>
                </Link>
                <Link
                  href="/download"
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-rose-400" />
                  <span>Download Safe Delivery App</span>
                </Link>
              </div>
            </div>

            {/* Visual Card / Stats */}
            <div className="lg:col-span-5 bg-[#090A0F] border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="border-b border-white/10 pb-4">
                <div className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider">
                  Transit Clinical Profile
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  Obstetric Emergency Priority 1
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400">Target Facility Intake</span>
                  <span className="font-semibold text-emerald-400">Tertiary Maternity Center</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400">Theater Availability</span>
                  <span className="font-semibold text-emerald-400 font-mono">CONFIRMED (Suite 2)</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400">Blood Bank Crossmatch</span>
                  <span className="font-semibold text-white font-mono">O+ Group Standby</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400">Telemetry ETA</span>
                  <span className="font-bold text-amber-400 font-mono">08 MINS IN-TRANSIT</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Zero secondary facility transfers logged across monitored corridors.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST & SAFETY (High level governance) */}
      <section id="safety" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-[#0D111A] border border-white/5 p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-2xl space-y-3 mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
              Governance &amp; Privacy
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Clinical Integrity and Data Protection
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Built in compliance with healthcare data protection principles and standardized clinical pre-hospital protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Certified Responders</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Only vetted ambulance operators and accredited hospital networks are connected to dispatch channels.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Secure Data Handling</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Patient records and vital telemetry are strictly access-controlled. No medical information is exposed publicly.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Complete Audit Logs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every call, dispatch decision, and clinical handover is logged for hospital quality auditing and accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SIGN UP & DOWNLOAD CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#0D111A] to-teal-950/40 border border-emerald-500/30 p-8 sm:p-12 text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Join the Solace Emergency Network
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Create your patient account with basic contact details, then download the Android mobile app for instant SOS dispatch and live transit navigation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign Up as Patient / Client</span>
            </Link>

            <Link
              href="/download"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white font-semibold text-sm border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Android App</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
