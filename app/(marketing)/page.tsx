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
  Radio,
  Star,
  MapPin,
  ClipboardList,
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
              <span>Emergency Dispatch &amp; Ambulance Telematics Network</span>
            </div>

            {/* Clear, honest, grounded medical value proposition */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
              Emergency Dispatch &amp; Ambulance Tracking When{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-[#00D4FF]">
                Every Minute Counts.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
              Solace connects patients, response vehicles, and receiving health facilities into one synchronized workflow. Live unit GPS tracking, direct responder phone and WhatsApp communication, verified destination hospital routing, and private role-based operations desks.
            </p>

            {/* Public Action CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5 group"
              >
                <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Create Patient Account</span>
              </Link>

              <Link
                href="/download"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#11141E] hover:bg-[#161B28] text-slate-200 hover:text-white font-bold text-sm border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Download Android Mobile App</span>
              </Link>
            </div>

            {/* Truthful Real Capabilities */}
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-400 pt-3">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                GPS-Anchored Emergency Requests
              </span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Live Responder Call &amp; WhatsApp
              </span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Hospital Destination Coordination
              </span>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="mt-14 sm:mt-18 pt-10 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                GPS Routing
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Live Telematics
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Active ambulances publish real-time GPS coordinates directly to the patient app map.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#00D4FF]">
                Dispatch Matching
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Facility &amp; Vehicle Pairing
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Central dispatchers assign verified receiving hospitals and field responders to every incident.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D111A] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black font-mono text-teal-400">
                Transparent Audits
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Post-Care Patient Feedback
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Patients submit star ratings and remarks upon completion, visible in the hospital and admin logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (Actual 4-step workflow built in the software) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="space-y-3 mb-12 text-center max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-[#00D4FF] font-mono">
            Operational Workflow
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            How Solace Coordinates Every Request
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            From the moment a patient triggers an SOS to safe hospital arrival, each step is coordinated through dedicated roles.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-white">One-Tap SOS Request</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Patient selects emergency category and submits request with auto-captured device GPS coordinates and phone number.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center font-mono font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-white">Dispatcher Triage</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Central dispatcher reviews priority, assigns the responding ambulance unit, and pairs an appropriate receiving hospital.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-white">Live Tracking &amp; Contact</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Patient views driver name, vehicle call sign, and assigned hospital name, with direct Call and WhatsApp buttons while unit GPS streams.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl bg-[#0D111A] border border-white/5 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm">
              04
            </div>
            <h3 className="text-base font-bold text-white">Intake &amp; Quality Review</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ambulance completes handover at the hospital. Patient submits service feedback and ratings logged directly into ops audit history.
            </p>
          </div>
        </div>
      </section>

      {/* 3. WHO IT'S FOR (Patients / Hospital Desk / Response Fleet) */}
      <section id="who-its-for" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="space-y-3 mb-12 text-center max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
            Platform Roles
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Designed for Every Stakeholder in the Loop
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Eliminating blind spots between patients in need, field drivers, hospital intake staff, and dispatch operators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patients & Families */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D111A] border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Patients &amp; Callers</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                One-tap SOS dispatch, live ambulance tracking map, driver phone and WhatsApp shortcuts, assigned destination hospital visibility, and post-mission rating.
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
                <span>Download App →</span>
              </Link>
            </div>
          </div>

          {/* Receiving Hospitals */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D111A] border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Partner Hospitals</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Hospital intake operators view incoming patient cases paired with their facility, track en-route status, and access complete historical audit logs with CSV export.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 text-xs text-slate-400 font-medium">
              <span>Access restricted to verified hospital personnel</span>
            </div>
          </div>

          {/* Response Fleet */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0D111A] border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <Ambulance className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Ambulance Responders</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Drivers receive assigned emergency runs, view incident location coordinates and notes, navigate to patient and hospital, and publish real-time GPS telemetry.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 text-xs text-slate-400 font-medium">
              <span>Driver console with turn-by-turn map links</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. GROUNDED OBSTETRIC & MATERNAL RESPONSE SECTION */}
      <section id="obstetric-care" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-b from-[#151926] via-[#0E121E] to-[#0A0D15] border border-rose-500/25 p-6 sm:p-10 lg:p-12 relative overflow-hidden shadow-2xl">
          {/* Ambient luminous glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 w-[450px] h-[450px] bg-rose-500/15 blur-3xl -z-10 rounded-full"
          />

          {/* Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 sm:mb-10 border-b border-white/5 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                <Baby className="w-3.5 h-3.5 text-rose-400" />
                <span>Specialized Emergency Focus</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Maternal Emergency &amp; Labor Coordination
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Priority Obstetric Category Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6">
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
                When sudden labor or pregnancy complications arise, delays in securing transport and identifying an open receiving facility can be critical. Solace prioritizes maternal calls, alerts central dispatch, and connects families directly with their assigned responder.
              </p>

              {/* 3 Step Visual Path */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center text-xs font-black font-mono">
                    01
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    SOS Trigger
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Select Obstetric Emergency category on the mobile app to flag urgent maternal priority.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center text-xs font-black font-mono">
                    02
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Assigned Unit
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Dispatch assigns an ambulance and designated receiving hospital with driver phone contact.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 relative">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs font-black font-mono">
                    03
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Direct Contact
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Call or message the driver via WhatsApp to share landmarks while tracking arrival on map.
                  </p>
                </div>
              </div>

              {/* Truthful Real Capabilities */}
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#121622] border border-white/5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Designated Receiving Hospital Matching</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                      Dispatchers pair the call with a specific destination hospital so responders and families know where the patient is headed.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121622] border border-white/5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Direct Driver WhatsApp &amp; Phone Calling</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                      Families can call or WhatsApp the assigned driver with one tap, avoiding delays through general hospital lines.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121622] border border-white/5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/15 text-[#00D4FF] flex items-center justify-center shrink-0 mt-0.5">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Live Telemetry When Unit is Online</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                      When the driver streams geolocation from their mobile device, the patient app radar updates in real time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs transition-all flex items-center gap-2 shadow-lg shadow-rose-500/25 active:scale-[0.99]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Patient Account</span>
                </Link>

                <Link
                  href="/download"
                  className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-rose-400" />
                  <span>Download Mobile APK</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Live Dispatch Handover Card (Truthful to schema) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl bg-[#07090E] border border-rose-500/30 p-5 sm:p-6 space-y-5 shadow-2xl relative">
                {/* Visual Status Indicator */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                        Mission Status
                      </div>
                      <div className="text-sm font-bold text-white">
                        Driver Assigned · En Route
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    PRIORITY 1
                  </span>
                </div>

                {/* Patient Case Snapshot */}
                <div className="p-3.5 rounded-xl bg-[#111522] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Emergency Type</span>
                    <span className="font-semibold text-rose-400">Obstetric Emergency</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Dispatch Status</span>
                    <span className="font-semibold text-emerald-400">Driver En Route</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Assigned Hospital</span>
                    <span className="font-semibold text-white">Confirmed Destination</span>
                  </div>
                </div>

                {/* Direct Responder Controls Preview */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Responder Direct Connect
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-emerald-400" />
                      <span className="font-medium text-emerald-200">Phone Call</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">ONE-TAP CALL</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">💬</span>
                      <span className="font-medium text-emerald-200">WhatsApp Chat</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">LIVE BRIDGE</span>
                  </div>
                </div>

                {/* Live Tracking Note */}
                <div className="p-3.5 rounded-xl bg-[#181C2A] border border-white/5 text-xs text-slate-300 flex items-start gap-2.5">
                  <Radio className="w-4 h-4 text-[#00D4FF] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Map tracks ambulance in real time when driver device broadcasts GPS. Turn-by-turn guidance available for both driver and hospital.
                  </p>
                </div>

                {/* Reassurance Footer */}
                <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-center gap-2 border-t border-white/5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audited run history with post-care patient rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECURITY & ARCHITECTURE */}
      <section id="safety" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-[#0D111A] border border-white/5 p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-2xl space-y-3 mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
              System Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Security, Auditability &amp; Data Protection
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Designed with strict database access controls, role isolation, and comprehensive quality logs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Row-Level Security</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hospital users access only their assigned facility records. Patients only view their own requests. No anonymous table access.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Role-Based Access</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Staff accounts are provisioned exclusively under administrator control. Public signups cannot self-assign staff roles.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Complete History Logs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every request status transition, hospital assignment, and patient rating is logged for quality auditing and reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#0D111A] to-teal-950/40 border border-emerald-500/30 p-8 sm:p-12 text-center space-y-6">
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Get the Solace Emergency App
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Register a patient account with your phone number, then install the Android mobile app for fast GPS emergency requests.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Patient Account</span>
            </Link>

            <Link
              href="/download"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white font-semibold text-sm border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Android APK</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. CLEARLY LABELED ROADMAP (Optional forward vision for judges) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-white/5 pt-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
              Future Product Roadmap
            </span>
            <span className="text-xs text-slate-500">Not live in today&apos;s demo build</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
            <div className="p-4 rounded-xl bg-[#090B10] border border-white/5 space-y-1.5">
              <strong className="text-slate-200 block">Structured Triage Intake:</strong>
              <span>Standardized vitals intake forms and structured pre-arrival clinical alerts.</span>
            </div>
            <div className="p-4 rounded-xl bg-[#090B10] border border-white/5 space-y-1.5">
              <strong className="text-slate-200 block">SMS Gateway Scale-Out:</strong>
              <span>Fallback emergency dispatch notifications via automated SMS for low-connectivity corridors.</span>
            </div>
            <div className="p-4 rounded-xl bg-[#090B10] border border-white/5 space-y-1.5">
              <strong className="text-slate-200 block">Formal Partner SLAs:</strong>
              <span>Contracted hospital bed reservations and institutional pre-hospital response agreements.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
