import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Download,
  ArrowRight,
  Activity,
  CheckCircle2,
  Radio,
  Building2,
  Users,
  Heart,
  ChevronRight,
  Stethoscope,
  MapPin,
  Clock,
  Cpu,
  Wifi,
  Lock,
  Zap,
} from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="space-y-24 pb-24 overflow-hidden">
      {/* 1. FUTURISTIC HERO SECTION WITH OFFICIAL BRANDING */}
      <section className="relative pt-12 sm:pt-20 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Ambient Holographic Glow Mesh */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative text-center space-y-8 max-w-4xl mx-auto">
          {/* Official Brand Logo Presentation */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#090D18] border border-emerald-500/30 shadow-xl shadow-emerald-500/10 backdrop-blur-xl">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-emerald-400/40 bg-[#06080F] p-0.5 shrink-0">
                <Image
                  src="/solace_icon.png"
                  alt="Solace Emergency Network"
                  width={32}
                  height={32}
                  className="object-contain rounded"
                  priority
                />
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-left">
                <span className="font-bold text-white tracking-wide">SOLACE</span>
                <span className="text-emerald-400 font-semibold">· NEXT-GEN EMERGENCY GRID</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
              </div>
            </div>
          </div>

          {/* Futuristic Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
            Pre-Hospital Coordination When{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Every Second Counts.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Synchronizing emergency responders, hospital trauma bays, and patient care through real-time autonomous dispatch orchestration, dynamic trajectory routing, and synchronized clinical telemetry.
          </p>

          {/* Primary CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/client"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Heart className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>📱 Open Client Mobile App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/signup"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-black text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Users className="w-4 h-4" />
              <span>Register Member</span>
            </Link>

            <Link
              href="/download"
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#090D18] hover:bg-[#111728] text-white font-bold text-sm border border-emerald-500/30 hover:border-emerald-400/60 shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download APK</span>
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-sm border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Staff &amp; Hospital Portal</span>
            </Link>
          </div>

          {/* Live Telemetry Status Ticker */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              TELEMETRY: SYNCHRONIZED
            </span>
            <span className="hidden sm:inline text-slate-600">/</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Zap className="w-3.5 h-3.5" />
              SUB-SECOND DISPATCH
            </span>
            <span className="hidden sm:inline text-slate-600">/</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              ENCRYPTED CLINICAL HANDOVER
            </span>
          </div>
        </div>

        {/* Futuristic Metric Strips */}
        <div className="mt-14 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-5 rounded-2xl bg-[#0B0F1D] border border-emerald-500/10 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              &lt; 90s
            </div>
            <div className="text-xs font-semibold text-white">Mobilization Speed</div>
            <div className="text-[11px] text-slate-400">Autonomous unit deployment</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0F1D] border border-cyan-500/10 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              100%
            </div>
            <div className="text-xs font-semibold text-white">Live Telemetry Link</div>
            <div className="text-[11px] text-slate-400">Continuous vehicle coordinates</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0F1D] border border-emerald-500/10 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              Pre-Alerted
            </div>
            <div className="text-xs font-semibold text-white">Trauma Centers</div>
            <div className="text-[11px] text-slate-400">Surgical team standby en route</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0B0F1D] border border-teal-500/10 text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-teal-400 font-mono">
              Zero-Delay
            </div>
            <div className="text-xs font-semibold text-white">Clinical Handover</div>
            <div className="text-[11px] text-slate-400">Tamper-evident incident logs</div>
          </div>
        </div>
      </section>

      {/* 2. CORE CAPABILITIES (FUTURISTIC CAPABILITIES) */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
              Autonomous Coordination Engine
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Engineered for Critical Pre-Hospital Triage
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Eliminating friction between initial distress signals, intelligent unit deployment, and verified emergency surgical intake.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Autonomous Fleet Dispatch & Telemetry Matrix */}
            <div className="p-7 rounded-3xl bg-[#0B0F1D] border border-white/5 hover:border-emerald-500/30 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Autonomous Mission Orchestration &amp; Telemetry
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Dynamic telemetry engine continuously evaluates responder coordinates, traffic bottlenecks, and clinical capabilities to deploy the optimal response unit instantly.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Live trajectory optimization across primary corridors</span>
              </div>
            </div>

            {/* Card 2: Specialized Care */}
            <div className="p-7 rounded-3xl bg-[#0B0F1D] border border-white/5 hover:border-cyan-500/30 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg group-hover:bg-cyan-500 group-hover:text-black transition-all">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Priority Maternal &amp; Specialized Care Transit
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Specialized clinical routing protocols ensure transit is directly channeled to hospitals with verified surgical readiness and neonatal intensive care availability.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Eliminating critical secondary transfer delays</span>
              </div>
            </div>

            {/* Card 3: Hospital Pre-Alert */}
            <div className="p-7 rounded-3xl bg-[#0B0F1D] border border-white/5 hover:border-emerald-500/30 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Synchronized Trauma Intake &amp; Bay Readiness
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Hospital emergency rooms receive automated audio-visual alerts, live distance countdowns, and advance vitals so medical personnel are prepped prior to curb arrival.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>One-touch surgical bay reservation protocol</span>
              </div>
            </div>

            {/* Card 4: Clinical Handover */}
            <div className="p-7 rounded-3xl bg-[#0B0F1D] border border-white/5 hover:border-teal-500/30 transition-all space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-lg group-hover:bg-teal-500 group-hover:text-black transition-all">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Verifiable Incident Records &amp; Handover
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Standardized digital handover captures real-time vital trends, medications administered en route, and timestamped transit milestones with full clinical compliance.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-teal-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Certified pre-hospital emergency documentation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HARDENED ARCHITECTURE SECTION: TELEMETRY FABRIC (NO SCHEMA/ROLE LEAKAGE) */}
      <section id="network-engine" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#090D18] border border-emerald-500/20 space-y-10 relative overflow-hidden">
          {/* Subtle Cybernetic Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          <div className="relative space-y-3 max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>High-Fidelity Telemetry Fabric</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Pre-Hospital Network Coordination
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              A distributed coordination layer connecting crisis distress signals directly with verified medical receiving centers without intermediary friction.
            </p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Sub-Second Telemetry Sync */}
            <div className="p-6 rounded-2xl bg-[#05070D] border border-white/5 hover:border-emerald-500/20 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  <Wifi className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Sub-Second Telemetry Sync</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time encrypted telemetry pipe streaming vehicle velocity, transit coordinates, and patient vitals with sub-second synchronization.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-emerald-400">
                LATENCY &lt; 20MS
              </div>
            </div>

            {/* 2. Predictive Trajectory Routing */}
            <div className="p-6 rounded-2xl bg-[#05070D] border border-white/5 hover:border-cyan-500/20 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Predictive Trajectory Routing</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dynamic algorithmic corridor calculation navigating urban congestion patterns to establish the fastest viable route to care.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-cyan-400">
                OPTIMIZED VECTORS
              </div>
            </div>

            {/* 3. Direct Trauma Bay Pre-Activation */}
            <div className="p-6 rounded-2xl bg-[#05070D] border border-white/5 hover:border-teal-500/20 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Direct Bay Pre-Activation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automated theater readiness alarms triggered automatically as the response unit enters the hospital facility geofence.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-teal-400">
                DYNAMIC GEOFENCING
              </div>
            </div>

            {/* 4. Zero-Trust Handover Security */}
            <div className="p-6 rounded-2xl bg-[#05070D] border border-white/5 hover:border-emerald-500/20 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Zero-Trust Clinical Security</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  End-to-end encrypted medical handover protocol guaranteeing patient confidentiality and authenticated care continuity.
                </p>
              </div>
              <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-emerald-400">
                AES-256 ENCRYPTED
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SPECIALIZED CARE COORDINATION SPOTLIGHT WITH FUTURISTIC HUD */}
      <section id="specialized-care" className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-teal-950/20 via-[#090D18] to-[#0B0F1D] border border-teal-500/20 p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 font-mono">
                <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                <span>High-Acuity Surgical Protocol</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                High-Acuity Transport &amp; Direct Surgical Readiness
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Critical emergencies — including obstetric complications, acute trauma, and cardiac events — require specialized clinical readiness. Solace coordinates transit directly to facilities with available operating theaters and clinical teams ready at the curb.
              </p>
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct routing to accredited acute trauma centers &amp; surgical units</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Pre-arrival intake notification: surgical team and blood supply alerted</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Continuous vital sign telemetry transmitted from transit crew to ER desk</span>
                </div>
              </div>
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="px-6 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black font-bold text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-2"
                >
                  <span>Enroll in Priority Coverage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Hospital Desk Login</span>
                </Link>
              </div>
            </div>

            {/* Acute Care Live Telemetry HUD Card Preview */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-[#05070D] border border-emerald-500/20 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  TELEMETRY HUD
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE TRANSIT
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    Designated Receiving Facility
                  </span>
                  <span className="font-bold text-white">Trauma Medical Center</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-400" />
                    Intake Bay Status
                  </span>
                  <span className="font-bold text-emerald-400 font-mono">BAY RESERVED</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Estimated Arrival
                  </span>
                  <span className="font-bold text-amber-400 font-mono">06 MINS REMAINING</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    Pre-Arrival Vitals Feed
                  </span>
                  <span className="font-mono text-slate-200">HR 78 · BP 118/76 · SpO2 99%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Direct handover protocol verified with attending clinical surgical team.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4B. MULTI-REGIONAL CLUSTERS & CONFIGURABLE ESCALATION ARCHITECTURE */}
      <section id="network-clusters" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 font-mono">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Multi-Corridor Grid Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Built for Private Consortia &amp; Public Health Integrations
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Solace does not lock your operations into a single jurisdiction. The platform operates simultaneously across private hospital networks in Ibadan and collaborative public pilots in Osun State with automated multi-tier escalation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ibadan Cluster */}
          <div className="rounded-2xl p-6 bg-gradient-to-b from-[#090D18] to-[#06080F] border border-blue-500/20 space-y-4 relative overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-blue-400 absolute top-4 right-4 animate-ping" />
            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-wider">
              <span>🏥 OYO STATE CORRIDOR</span>
            </div>
            <h3 className="text-lg font-bold text-white">Ibadan Private Hospital Network</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Partnering with private tertiary centers and specialist maternity clinics (UCH Private Wing, LifeCare Surgical, Jid-Mek Bodija). Pre-arrival bed reservations and curb surgical teams prevent emergency room bottlenecks.
            </p>
            <div className="pt-2 border-t border-white/10 text-[11px] text-blue-300 font-mono">
              Fallback: Oyo State EMS (732) / UCH Direct Trauma Desk
            </div>
          </div>

          {/* Osun Cluster */}
          <div className="rounded-2xl p-6 bg-gradient-to-b from-[#090D18] to-[#06080F] border border-purple-500/20 space-y-4 relative overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-purple-400 absolute top-4 right-4 animate-ping" />
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-wider">
              <span>🏛️ OSUN STATE PILOT</span>
            </div>
            <h3 className="text-lg font-bold text-white">OSEMSAS Collaborative Cluster</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Collaborative public sector integration (State Specialist Hospital Asubiaro, UNIOSUN Teaching Hospital, OAUTHC Ife). Fast-track obstetric and trauma protocols reducing transit-to-intake times below 15 minutes.
            </p>
            <div className="pt-2 border-t border-white/10 text-[11px] text-purple-300 font-mono">
              Fallback: OSEMSAS Central Control Room (Osogbo)
            </div>
          </div>

          {/* 4-Tier Escalation */}
          <div className="rounded-2xl p-6 bg-gradient-to-b from-[#090D18] to-[#06080F] border border-emerald-500/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
              <span>⚡ FAIL-SAFE ENGINE</span>
            </div>
            <h3 className="text-lg font-bold text-white">4-Tier Fallback SLA Architecture</h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>Tier 1: Direct Primary Partner Allocation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <span>Tier 2: Regional Mutual Aid Broadcast</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <span>Tier 3: Public Emergency Service Command</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0">4</span>
                <span>Tier 4: Tele-Triage Medical Director Command</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION - DUAL PATH WITH OFFICIAL LOGO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#090D18] to-teal-950/40 border border-emerald-500/30 p-8 sm:p-14 text-center space-y-7 relative overflow-hidden">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#06080F] border border-emerald-400/40 p-1.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Image
                src="/solace_icon.png"
                alt="Solace EMS Logo"
                width={40}
                height={40}
                className="object-contain rounded-lg"
              />
            </div>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Connect to Coordinated Pre-Hospital Response
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Whether you are an individual configuring your emergency profile or a healthcare provider coordinating acute intake, join the network in seconds.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Create Account</span>
            </Link>

            <Link
              href="/download"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#05070D] hover:bg-[#0E1324] text-white font-bold text-sm border border-white/10 hover:border-emerald-500/40 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download Mobile App (APK)</span>
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-transparent hover:bg-white/5 text-slate-300 hover:text-white font-semibold text-sm border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>Staff Portal</span>
            </Link>
          </div>

          <div className="pt-2 text-xs text-slate-500 font-mono">
            Autonomous Emergency Grid · Direct Installation · Synchronized Medical Response
          </div>
        </div>
      </section>
    </div>
  );
}
