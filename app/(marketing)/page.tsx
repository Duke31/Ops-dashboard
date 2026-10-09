import Link from "next/link";
import {
  Ambulance,
  Baby,
  ShieldCheck,
  FileText,
  Download,
  AlertCircle,
  ArrowRight,
  Clock,
  Activity,
  CheckCircle2,
  MapPin,
  HeartPulse,
  Radio,
  Building2,
  Stethoscope,
  PhoneCall,
  ChevronRight,
  Share2,
} from "lucide-react";

export default function MarketingLandingPage() {
  return (
    <div className="space-y-24 sm:space-y-32 pb-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 sm:pt-20 lg:pt-24 overflow-hidden">
        {/* Subtle radial aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl -z-10"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Status indicator badge (anti-slop, clean typography) */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Next-Gen EMS Telematics · Southwestern Nigeria Pilot</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Pre-Hospital Coordination When{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Every Second Matters.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
              Closing the survival gap across Southwestern Nigeria. Real-time emergency vehicle telematics, direct ER intake integration, and specialized maternal transit.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/download"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2.5 group"
              >
                <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                <span>Download Android APK</span>
                <span className="text-[11px] font-mono opacity-70">v1.0.2</span>
              </Link>

              <Link
                href="/hospital"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] text-slate-200 hover:text-white font-bold text-sm border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Hospital Desk Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>

            {/* Quick trust kicker */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-2">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                No Google Play Store Account Needed
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Optimized for Android 8.0+ Devices
              </span>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="mt-14 sm:mt-18 pt-10 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-5 rounded-2xl bg-[#11141E] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono text-emerald-400">
                &lt;15 Min
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Target Response Time
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Optimized arterial dispatch routing across congested transit chokepoints.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#11141E] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono text-cyan-400">
                End-to-End
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                ePCR Clinical Audit Logs
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Complete digital vitals, triage notes, and handover timestamps stored securely.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#11141E] border border-white/5 space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono text-amber-400">
                Pre-Alerted
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Emergency Intake Bays
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Receiving hospitals pre-allocate beds, surgical theaters, and blood before arrival.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE PILLARS GRID */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="space-y-4 mb-12 text-center max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
            Operational Architecture
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Designed for African Urban Transit Realities
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Off-the-shelf dispatch software fails when confronted with unmapped bypasses, intermittent GSM networks, and uncoordinated hospital triage. Solace builds for the field.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#11141E] border border-white/5 hover:border-emerald-500/30 transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <Ambulance className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                Dynamic Pre-Hospital Telematics
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Live Mapbox routing mitigating traffic corridors across Iwo Road, Ring Road, Dugbe, and Osogbo axes. Responders receive continuous turn-by-turn routing with traffic density avoidance.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-emerald-400 font-semibold">Sub-second Telemetry</span>
              <span>GPS + Native Dialing</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#11141E] border border-white/5 hover:border-rose-500/30 transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                <Baby className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                Maternal &ldquo;Safe Delivery&rdquo; Pass
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Dedicated obstetric dispatch routing expectant mothers directly to facilities with active theaters and neonatal readiness. Eliminates dangerous secondary redirects during active labor.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-rose-400 font-semibold">NICU / Theater Verified</span>
              <span>Zero-Redirection Policy</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#11141E] border border-white/5 hover:border-cyan-500/30 transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                Advance Hospital Triage Notification
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                ER desks receive audible pre-alerts, vitals, patient age category, and live distance countdowns before patient arrival. Doctors review incoming trauma or obstetric cases on dedicated consoles.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-cyan-400 font-semibold">Audible ER Pre-Alert</span>
              <span>Live ETA Countdown</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#11141E] border border-white/5 hover:border-amber-500/30 transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Immutable ePCR &amp; Handover Logs
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Certified digital incident handover reports exportable as legal medical summaries. Tracks dispatch time, pickup coordinates, in-transit interventions, and receiving clinician sign-off.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-amber-400 font-semibold">ePCR Timestamped</span>
              <span>Medico-Legal Standard</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MATERNAL CARE FEATURE SPOTLIGHT */}
      <section id="safe-delivery" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-b from-[#161B26] to-[#11141E] border border-rose-500/20 p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle glow */}
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
                The three delays in maternal health—delay in seeking care, delay in reaching a health facility, and delay in receiving adequate care—remain the greatest threat to mother and newborn survival.
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
                    <strong className="text-white">Neonatal Intensive Care Readiness:</strong> Pre-alert triggers newborn resuscitation equipment setup prior to ambulance dock.
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href="/download"
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Safe Delivery App</span>
                </Link>
                <a
                  href="tel:+2348133355709"
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
                  <span>Obstetric Desk: +234 813 335 5709</span>
                </a>
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
                  <span className="font-semibold text-emerald-400">OAUTHC Complex Annex</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400">Theater Availability</span>
                  <span className="font-semibold text-emerald-400 font-mono">CONFIRMED (Bay 2)</span>
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
                <span>Zero secondary facility transfers logged across pilot corridors.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOSPITAL TRIAGE & ER WORKFLOW */}
      <section id="hospitals" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="space-y-4 mb-12 text-center max-w-2xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-mono">
            Clinical Intake Operations
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Seamless Handover to Emergency Departments
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Eliminating unannounced ambulance arrivals. Receiving hospital desks track incoming units with continuous live telemetry and clinical vitals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#11141E] border border-white/5 space-y-4">
            <div className="text-2xl font-black font-mono text-cyan-400">01</div>
            <h3 className="text-base font-bold text-white">Live Patient Telemetry Dispatch</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a citizen or pregnant mother requests assistance, the closest certified response unit is routed with precise GPS, road conditions, and medical urgency priority.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#11141E] border border-white/5 space-y-4">
            <div className="text-2xl font-black font-mono text-emerald-400">02</div>
            <h3 className="text-base font-bold text-white">Hospital Bed &amp; Theater Pre-Alert</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receiving ER units receive audible chimes, patient age category, vital sign snapshots, and an accurate countdown clock to prepare intake bays before arrival.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#11141E] border border-white/5 space-y-4">
            <div className="text-2xl font-black font-mono text-amber-400">03</div>
            <h3 className="text-base font-bold text-white">Signed Digital Clinical Handover</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paramedics hand over patients directly to attending physicians. Medical notes and timestamps are locked into the audit trail for clinical governance.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/hospital"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-colors"
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Access Receiving Hospital Console</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 5. PILOT GEOGRAPHY & CORRIDORS */}
      <section id="pilot-regions" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-[#11141E] border border-white/5 p-8 sm:p-12">
          <div className="max-w-2xl space-y-3 mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
              Regional Coverage
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Operational Corridors in Oyo &amp; Osun States
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Focused on the primary high-volume transit routes where vehicular trauma and obstetric delays historically result in poor clinical outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-[#090A0F] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Ibadan Metropolitan Axis</span>
                <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">Active Response Zone</span>
              </div>
              <p className="text-xs text-slate-400">
                Ring Road · Iwo Road Interchange · Challenge · Dugbe Central · Bodija / UI Corridor · Alakia Expressway
              </p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5">
                Integrated with tertiary and secondary emergency trauma bays across Oyo State.
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#090A0F] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Osogbo Urban &amp; Hospital Nexus</span>
                <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">Active Response Zone</span>
              </div>
              <p className="text-xs text-slate-400">
                Oke-Fia · Ogo-Oluwa Commercial · Biket Junction · Gbongan-Osogbo Expressway · OAU Complex Annex Corridor
              </p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5">
                Dedicated obstetric transit corridors connecting primary health centers to surgical theaters.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION / DOWNLOAD TEASER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-950/60 via-[#11141E] to-teal-950/60 border border-emerald-500/30 p-8 sm:p-14 text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Get the Solace Emergency App on Your Android Device
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Equip your family, expectant mothers, or response fleet with instant emergency SOS triggers, live Mapbox tracking, and verified clinical facility admission.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/download"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Go to APK Download Hub</span>
            </Link>

            <Link
              href="/hospital"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Hospital Staff Login</span>
            </Link>
          </div>

          <div className="pt-2 text-xs text-slate-400 font-mono">
            Direct installation · Verified SHA-256 binary release · Android 8.0+
          </div>
        </div>
      </section>
    </div>
  );
}
