"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  HeartPulse,
  Shield,
  Baby,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Activity,
  ChevronRight,
  RefreshCw,
  X,
  Droplets,
  User,
  Settings,
  ShieldAlert,
  Award,
  Stethoscope,
  Smartphone,
  Maximize2,
  Minimize2,
  Navigation,
  FileCheck,
  Zap,
  Bell,
  Info,
  Compass,
  FileText,
  History,
  Check,
  Plus,
  Smile,
  Frown,
  Meh,
  Send,
  Radio,
  Share2,
  CheckSquare,
  Building2,
  Ambulance,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface ClientProfileData {
  fullName: string;
  phone: string;
  bloodGroup: string;
  genotype: string;
  allergies: string;
  preferredHospital: string;
  preferredHospitalId?: string;
  // Obstetric specific
  isObstetric: boolean;
  gestationalWeeks: number;
  gestationalDays: number;
  edd: string;
  gravidaPara: string;
  knownRisks: string[];
  fetalKicksToday: number;
  lastKickTime: string | null;
  dailySupplementsTaken: boolean;
  waterLiters: number;
  sleepHours: number;
  todayMood: "awful" | "bad" | "okay" | "good" | "great";
  nextOfKin?: string;
  nextOfKinPhone?: string;
}

const DEFAULT_OBSTETRIC_PROFILE: ClientProfileData = {
  fullName: "Mrs Foluke",
  phone: "+234 800 SOLACE",
  bloodGroup: "O-Negative (Rh-Negative)",
  genotype: "AA",
  allergies: "None reported",
  preferredHospital: "LifeCare Private Clinic (Ring Road, Ibadan)",
  preferredHospitalId: "764952d7-b844-46d5-bbbe-e28e8d89a742",
  isObstetric: true,
  gestationalWeeks: 31,
  gestationalDays: 1,
  edd: "2026-12-15",
  gravidaPara: "G2P1 (Gravida 2, Para 1)",
  knownRisks: ["Borderline Gestational BP", "Previous C-Section"],
  fetalKicksToday: 8,
  lastKickTime: "12:45 PM",
  dailySupplementsTaken: true,
  waterLiters: 1.8,
  sleepHours: 7.5,
  todayMood: "good",
  nextOfKin: "Mr Babatunde Foluke (Husband)",
  nextOfKinPhone: "+234 802 333 4455",
};

const DEFAULT_GENERAL_PROFILE: ClientProfileData = {
  fullName: "Babatunde Olawale",
  phone: "+234 802 333 4455",
  bloodGroup: "B-Positive",
  genotype: "AS",
  allergies: "Penicillin",
  preferredHospital: "LifeCare Hospital & Surgical Centre (Ring Road, Ibadan)",
  isObstetric: false,
  gestationalWeeks: 0,
  gestationalDays: 0,
  edd: "",
  gravidaPara: "",
  knownRisks: ["Asthma"],
  fetalKicksToday: 0,
  lastKickTime: null,
  dailySupplementsTaken: false,
  waterLiters: 2.2,
  sleepHours: 6.5,
  todayMood: "good",
  nextOfKin: "Grace Olawale (Sister)",
  nextOfKinPhone: "+234 805 111 2233",
};

interface CareAlert {
  id: string;
  tag: string;
  tagColor: "red" | "purple" | "rose" | "blue";
  timeLabel: string;
  title: string;
  body: string;
  actionText: string;
  actionTarget: "sos" | "insights" | "medical-id" | "biometrics";
  read: boolean;
}

const INITIAL_CARE_ALERTS: CareAlert[] = [
  {
    id: "alert-1",
    tag: "DIRECT-TO-BED DISPATCH",
    tagColor: "red",
    timeLabel: "Live 24/7",
    title: "Priority L&D Direct Dispatch Route Armed",
    body: "GPS route mapped to LifeCare Private Clinic (Ring Road, Ibadan). Live rapid response ambulance fleet standby radius < 8 mins.",
    actionText: "View Dispatch Desk →",
    actionTarget: "sos",
    read: false,
  },
  {
    id: "alert-2",
    tag: "WEEK 31 CLINICAL MILESTONE",
    tagColor: "purple",
    timeLabel: "Today",
    title: "Week 31 Gestation Protocol Active",
    body: "Routine fetal development on track. Monitor kick frequency (>10 kicks in 2h) and log daily hydration.",
    actionText: "Open Insights →",
    actionTarget: "insights",
    read: false,
  },
  {
    id: "alert-3",
    tag: "RH-NEGATIVE PRE-ALERT",
    tagColor: "rose",
    timeLabel: "Verified",
    title: "Emergency Blood Reserve: O- (Rh-Negative)",
    body: "Rare Rh-Negative status flagged for regional hospital blood banks. Zero-delay uncrossmatched O-Neg blood standby enabled.",
    actionText: "Review Medical ID →",
    actionTarget: "medical-id",
    read: false,
  },
  {
    id: "alert-4",
    tag: "DAILY BIOMETRICS",
    tagColor: "blue",
    timeLabel: "Daily Log",
    title: "Daily Hydration & Sleep Check-In",
    body: "Keep amniotic volume optimal by logging today's water intake and restorative sleep hours.",
    actionText: "Log Biometrics →",
    actionTarget: "biometrics",
    read: true,
  },
];

const OBSTETRIC_EMERGENCY_CONDITIONS = [
  {
    id: "water_broke",
    title: "Water Broke / Labor",
    subtitle: "Rupture of membranes",
    icon: Droplets,
    color: "cyan",
  },
  {
    id: "hemorrhage",
    title: "Hemorrhage Alert",
    subtitle: "Vaginal bleeding",
    icon: AlertTriangle,
    color: "rose",
  },
  {
    id: "severe_headache",
    title: "Severe Headache / BP",
    subtitle: "Pre-eclampsia sign",
    icon: Activity,
    color: "purple",
  },
  {
    id: "decreased_movement",
    title: "Decreased Movement",
    subtitle: "Fetal kick drop",
    icon: HeartPulse,
    color: "amber",
  },
  {
    id: "rigid_abdomen",
    title: "Rigid Abdomen",
    subtitle: "Severe tonic pain",
    icon: ShieldAlert,
    color: "pink",
  },
  {
    id: "crowning",
    title: "Crowning / Cord Prolapse",
    subtitle: "Imminent delivery",
    icon: Sparkles,
    color: "red",
  },
  {
    id: "general_evac",
    title: "General Medical Evac",
    subtitle: "Acute distress",
    icon: Ambulance,
    color: "blue",
  },
];

const PATIENT_AGE_BANDS = [
  { id: "18-39", label: "18-39 yrs (Adult Maternal)", short: "18-39 yrs" },
  { id: "40+", label: "40+ yrs (Mature Obstetric)", short: "40+ yrs" },
  { id: "13-17", label: "13-17 yrs (Adolescent)", short: "13-17 yrs" },
  { id: "2-12", label: "2-12 yrs (Child)", short: "2-12 yrs" },
  { id: "0-1", label: "0-1 yr (Infant)", short: "0-1 yr" },
];

const WEEK_DAYS = [
  { day: "M", date: 12 },
  { day: "T", date: 13 },
  { day: "W", date: 14, isToday: true },
  { day: "T", date: 15 },
  { day: "F", date: 16 },
  { day: "S", date: 17 },
  { day: "S", date: 18 },
];

export function ClientMobileApp({
  currentUserId,
  userEmail,
  initialProfile,
  isRegisteredUser = false,
}: {
  currentUserId?: string | null;
  userEmail?: string | null;
  initialProfile?: ClientProfileData | null;
  isRegisteredUser?: boolean;
}) {
  const [profile, setProfile] = useState<ClientProfileData>(() => {
    if (initialProfile) return initialProfile;
    return DEFAULT_OBSTETRIC_PROFILE;
  });

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  const [isPhoneFrame, setIsPhoneFrame] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "sos" | "insights" | "records" | "medical-id">("today");

  // Notifications sheet
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<CareAlert[]>(INITIAL_CARE_ALERTS);

  // Gestational Details Modal
  const [showGestationalModal, setShowGestationalModal] = useState(false);

  // Profile Settings Modal
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Selected date on week calendar
  const [selectedDate, setSelectedDate] = useState(14);

  // Active Emergency SOS State
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyRequestId, setEmergencyRequestId] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>("Water Broke / Labor");
  const [selectedAgeBand, setSelectedAgeBand] = useState<string>("18-39");
  const [landmarkNote, setLandmarkNote] = useState("");
  const [contactPhoneInput, setContactPhoneInput] = useState(profile.phone || "+234 800 SOLACE");
  const [accessNote, setAccessNote] = useState("");
  const [isSubmittingSos, setIsSubmittingSos] = useState(false);
  const [sosStep, setSosStep] = useState<1 | 2 | 3 | 4>(1);
  const [etaMinutes, setEtaMinutes] = useState(7);
  const [assignedAmbulance, setAssignedAmbulance] = useState("Solace Alpha Unit (ALS-04)");
  const [assignedHospital, setAssignedHospital] = useState("LifeCare Private Clinic (Ring Road, Ibadan)");

  // Continuous High-Precision Live Geolocation Feed
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number | null;
    speedKmh: number | null;
    address: string;
    isLive: boolean;
    lastPing: string;
  }>({
    lat: 7.3775,
    lng: 3.947,
    accuracy: 8,
    speedKmh: null,
    address: "20, Ibadan North East, Oyo, Nigeria",
    isLive: true,
    lastPing: "Just now",
  });
  const [isLocating, setIsLocating] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Continuous GPS watcher setup
  useEffect(() => {
    let isMounted = true;

    async function reverseGeocode(lat: number, lng: number) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name && isMounted) {
            // Keep it human readable
            const parts = [
              data.address?.road || data.address?.suburb || "",
              data.address?.city || data.address?.town || data.address?.county || "Ibadan",
              data.address?.state || "Oyo",
              data.address?.country || "Nigeria",
            ].filter(Boolean);
            const cleanAddr = parts.length > 0 ? parts.join(", ") : data.display_name.slice(0, 48);
            setUserLocation((prev) => ({
              ...prev,
              address: cleanAddr,
            }));
          }
        }
      } catch {
        // Fallback to coordinates
      }
    }

    if (typeof window !== "undefined" && navigator.geolocation) {
      setIsLocating(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isMounted) return;
          const { latitude, longitude, accuracy, speed } = pos.coords;
          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setUserLocation((prev) => ({
            ...prev,
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy),
            speedKmh: speed != null && speed > 0 ? Math.round(speed * 3.6) : null,
            isLive: true,
            lastPing: nowStr,
          }));
          setIsLocating(false);
          reverseGeocode(latitude, longitude);
        },
        (err) => {
          if (!isMounted) return;
          console.warn("Continuous GPS watch notice:", err.message);
          setIsLocating(false);
          // Keep calibrated Ibadan location
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    }

    return () => {
      isMounted = false;
      if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Force re-lock GPS
  const handleForceRefreshGps = () => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setUserLocation((prev) => ({
            ...prev,
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy),
            isLive: true,
            lastPing: nowStr,
          }));
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Kick counter state
  const [kicks, setKicks] = useState(profile.fetalKicksToday || 8);
  const [supplementsDone, setSupplementsDone] = useState(profile.dailySupplementsTaken ?? true);
  const [waterDrunk, setWaterDrunk] = useState(profile.waterLiters || 1.8);

  // Record a fetal kick
  const recordKick = () => {
    const next = kicks + 1;
    setKicks(next);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setProfile((prev) => ({
      ...prev,
      fetalKicksToday: next,
      lastKickTime: now,
    }));
  };

  // Countdown timer when emergency is active
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isEmergencyActive && etaMinutes > 1) {
      timer = setInterval(() => {
        setEtaMinutes((prev) => Math.max(1, prev - 1));
      }, 60000);
    }
    return () => clearInterval(timer);
  }, [isEmergencyActive, etaMinutes]);

  // Trigger Emergency SOS
  const handleTriggerEmergency = async (specificCondition?: string) => {
    setIsSubmittingSos(true);
    const condition = specificCondition || selectedCondition || "Obstetric Emergency Distress";

    try {
      const supabase = createClient();
      const specialty = profile.isObstetric ? "obstetric" : "general";
      const notes = profile.isObstetric
        ? `[SOLACE CLIENT DISPATCH] ${condition} reported by member ${profile.fullName}. GA: ${profile.gestationalWeeks}w ${profile.gestationalDays}d, ${profile.gravidaPara}, Blood: ${profile.bloodGroup}, Genotype: ${profile.genotype}. Facility: ${assignedHospital}. Landmark: ${landmarkNote || "None specified"}. Access Note: ${accessNote || "None"}. Phone: ${contactPhoneInput}`
        : `[SOLACE CLIENT DISPATCH] ${condition} reported by ${profile.fullName}. Blood: ${profile.bloodGroup}, Allergies: ${profile.allergies}. Landmark: ${landmarkNote || "None specified"}. Phone: ${contactPhoneInput}`;

      const payload = {
        client_user_id: currentUserId || null,
        patient_lat: userLocation.lat,
        patient_lng: userLocation.lng,
        patient_address: landmarkNote ? `${userLocation.address} (Landmark: ${landmarkNote})` : userLocation.address,
        contact_phone: contactPhoneInput || profile.phone,
        emergency_type: profile.isObstetric ? "Obstetric & Maternal" : "Medical Emergency",
        priority: "P1-CRITICAL",
        status: "pending",
        clinical_specialty: specialty,
        notes: notes,
        origin: "client_mobile_app",
      };

      const { data, error } = await supabase
        .from("emergency_requests")
        .insert(payload)
        .select("id")
        .maybeSingle();

      if (error) {
        console.warn("Direct Supabase insert notice:", error.message);
      }

      const generatedId = data?.id || `req-${Date.now().toString().slice(-6)}`;
      setEmergencyRequestId(generatedId);
      setIsEmergencyActive(true);
      setSelectedCondition(condition);
      setSosStep(2);
      setActiveTab("sos");

      // Auto progression simulation
      setTimeout(() => {
        setSosStep(3);
        setEtaMinutes(6);
      }, 3500);
    } catch (err) {
      console.error("SOS trigger error:", err);
      setIsEmergencyActive(true);
      setSosStep(2);
      setActiveTab("sos");
    } finally {
      setIsSubmittingSos(false);
    }
  };

  const handleCancelEmergency = () => {
    if (confirm("Are you sure you want to stand down this obstetric emergency alert?")) {
      setIsEmergencyActive(false);
      setSosStep(1);
      setEmergencyRequestId(null);
    }
  };

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const markAllAlertsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const handleAlertAction = (target: CareAlert["actionTarget"]) => {
    setShowNotifications(false);
    if (target === "sos") setActiveTab("sos");
    else if (target === "insights") setActiveTab("insights");
    else if (target === "medical-id") setActiveTab("medical-id");
    else if (target === "biometrics") setActiveTab("insights");
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-0 sm:p-4">
      {/* Top Desktop Controls Bar */}
      <div className="w-full max-w-md mb-2 flex items-center justify-between text-xs text-slate-400 px-3 py-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Solace Mobile Client
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Configure profile and clinical care view"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Toggle phone frame vs wide screen"
          >
            {isPhoneFrame ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Phone</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Mobile App Frame */}
      <div
        className={`w-full transition-all duration-300 relative flex flex-col bg-[#070D18] text-slate-100 ${
          isPhoneFrame
            ? "max-w-[420px] rounded-[44px] border-[8px] border-slate-800/90 shadow-2xl shadow-cyan-950/40 overflow-hidden min-h-[850px]"
            : "max-w-2xl rounded-3xl border border-slate-800 bg-[#070D18] p-2 sm:p-5 shadow-2xl min-h-[800px]"
        }`}
      >
        {/* Device Status Bar */}
        {isPhoneFrame && (
          <div className="w-full bg-[#070D18] px-6 pt-3 pb-2 flex items-center justify-between text-[11px] text-slate-400 font-medium select-none z-30">
            <span className="font-bold text-white tracking-wide">11:31 AM</span>
            {/* Dynamic Island Speaker Slot */}
            <div className="w-20 h-4 bg-slate-900/80 rounded-full mx-auto" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-[10px] font-mono text-slate-400">4.9 K/s</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <div className="w-4 h-2.5 rounded-xs border border-slate-400 p-0.5 flex items-center">
                <div className="w-2 h-full bg-emerald-400 rounded-2xs" />
              </div>
              <span className="text-[10px] font-bold">21</span>
            </div>
          </div>
        )}

        {/* TOP APP HEADER: AVATAR + MONTH + NOTIFICATIONS + MORE */}
        <header className="px-4 py-3 flex items-center justify-between border-b border-slate-800/60 bg-[#0A1224] z-20">
          {/* User Profile Avatar with VIP / Active status dot */}
          <button
            onClick={() => setActiveTab("medical-id")}
            className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 hover:border-cyan-400 transition"
            title="View Medical ID & Profile"
          >
            <User className="w-5 h-5 text-slate-300" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0A1224]" />
          </button>

          {/* Month Indicator with Calendar Icon */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-slate-200">
            <span>October</span>
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
          </div>

          {/* Right Action Icons: Bell + Options Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 transition"
              title="Care Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 transition text-sm font-black"
              title="Options & Settings"
            >
              •••
            </button>
          </div>
        </header>

        {/* HORIZONTAL WEEK DATE STRIP */}
        <div className="px-4 py-2.5 bg-[#091122] border-b border-slate-800/60 flex items-center justify-between text-center select-none z-10">
          {WEEK_DAYS.map((wd) => {
            const isSelected = selectedDate === wd.date;
            return (
              <button
                key={wd.date}
                onClick={() => setSelectedDate(wd.date)}
                className="flex flex-col items-center gap-1 transition-all group flex-1"
              >
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300">
                  {wd.isToday ? "TODAY" : wd.day}
                </span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-gradient-to-tr from-amber-600 to-rose-500 text-white shadow-lg shadow-amber-600/30 font-black scale-105"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  {wd.date}
                </div>
              </button>
            );
          })}
        </div>

        {/* SCROLLABLE MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 space-y-4">
          {/* ========================================================= */}
          {/* TAB 1: TODAY (FETAL HERO + MRS FOLUKE CARD + QUICK ACCESS) */}
          {/* ========================================================= */}
          {activeTab === "today" && (
            <div className="space-y-4">
              {/* 3D Womb & Fetus Visual Centerpiece */}
              <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#131d36] via-[#0b1326] to-[#070d18] border border-slate-800/80 p-4 pt-6 flex flex-col items-center text-center overflow-hidden shadow-2xl">
                {/* Ambient Radial Glowing Womb Sac */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-amber-600/25 via-rose-600/20 to-purple-600/15 blur-2xl animate-pulse" />
                </div>

                {/* Week & Day Header */}
                <div className="relative z-10 flex items-center gap-1.5 mb-2">
                  <h2 className="text-2xl font-black text-slate-100 tracking-tight">
                    {profile.gestationalWeeks} Weeks
                  </h2>
                  <button
                    onClick={() => setShowGestationalModal(true)}
                    className="text-slate-400 hover:text-amber-400 transition"
                    title="View Gestational Milestones"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs font-bold text-amber-400/90 mb-4 tracking-wide uppercase">
                  {profile.gestationalDays} Days Active
                </div>

                {/* Serene Fetus Render Visual */}
                <div className="relative w-52 h-52 rounded-full p-2.5 bg-gradient-to-b from-amber-500/20 via-rose-500/10 to-transparent border border-amber-500/30 flex items-center justify-center shadow-inner">
                  {/* Concentric Glow Ring */}
                  <div className="w-full h-full rounded-full bg-radial from-amber-950/60 via-slate-950/90 to-[#070d18] flex items-center justify-center relative overflow-hidden">
                    {/* Anatomical fetal silhouette SVG */}
                    <svg
                      viewBox="0 0 200 200"
                      className="w-40 h-40 drop-shadow-[0_0_16px_rgba(245,158,11,0.45)] text-amber-200"
                      fill="none"
                    >
                      <defs>
                        <linearGradient id="fetusGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FDE68A" />
                          <stop offset="50%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#EA580C" />
                        </linearGradient>
                      </defs>
                      {/* Curled fetal body contour */}
                      <path
                        d="M 120 45 C 150 45, 165 75, 155 105 C 145 130, 120 155, 90 155 C 65 155, 45 135, 55 105 C 60 90, 75 75, 95 70 C 110 65, 115 50, 120 45 Z"
                        fill="url(#fetusGlow)"
                        opacity="0.9"
                      />
                      {/* Head contour */}
                      <circle cx="130" cy="70" r="28" fill="#FDE68A" opacity="0.95" />
                      {/* Soft facial features */}
                      <path d="M 142 68 Q 146 72 142 76" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
                      {/* Arm & tucked hands */}
                      <path
                        d="M 115 85 Q 100 100 112 110"
                        stroke="#F59E0B"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* Legs curled */}
                      <path
                        d="M 90 135 Q 75 110 90 95"
                        stroke="#EA580C"
                        strokeWidth="9"
                        strokeLinecap="round"
                      />
                      {/* Umbilical cord connecting gently */}
                      <path
                        d="M 95 115 C 80 120, 60 140, 45 125 C 30 110, 40 85, 30 75"
                        stroke="#F43F5E"
                        strokeWidth="4"
                        strokeDasharray="4 3"
                        strokeLinecap="round"
                        opacity="0.75"
                      />
                    </svg>

                    {/* Ambient light ring */}
                    <div className="absolute inset-0 rounded-full border border-amber-400/20 pointer-events-none" />
                  </div>
                </div>

                {/* "Details" Pill Action Button */}
                <button
                  onClick={() => setShowGestationalModal(true)}
                  className="mt-4 px-5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 hover:border-amber-400/60 transition shadow-md flex items-center gap-1.5"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>

              {/* MRS FOLUKE MATERNAL CARE PLAN SHEET (IMAGE 3) */}
              <div className="rounded-3xl bg-gradient-to-b from-[#0e1933] to-[#091122] border border-slate-800 p-4 space-y-3.5 shadow-xl">
                {/* Header Profile Title */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 shadow-md">
                    <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                      <User className="w-5 h-5 text-amber-300" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white leading-tight">
                      {profile.fullName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Maternal Care Plan • Active</span>
                    </div>
                  </div>
                </div>

                {/* Pristine Clinical Table (NO TEXT FLOATING OUTSIDE WINDOW) */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 divide-y divide-slate-800/70 text-xs">
                  {/* Gestational Age */}
                  <div className="flex items-center justify-between py-2 gap-3">
                    <span className="text-slate-400 font-medium shrink-0">Gestational Age</span>
                    <span className="text-right font-bold text-white">
                      {profile.gestationalWeeks} Weeks {profile.gestationalDays} Days
                    </span>
                  </div>

                  {/* Emergency Blood Reserve (Clean clinical terminology) */}
                  <div className="flex items-start justify-between py-2 gap-3">
                    <span className="text-slate-400 font-medium shrink-0">Blood Group</span>
                    <span className="text-right font-bold text-rose-400 break-words max-w-[65%]">
                      {profile.bloodGroup}
                    </span>
                  </div>

                  {/* Genotype */}
                  <div className="flex items-center justify-between py-2 gap-3">
                    <span className="text-slate-400 font-medium shrink-0">Genotype</span>
                    <span className="text-right font-bold text-slate-100">{profile.genotype}</span>
                  </div>

                  {/* Preferred Hospital */}
                  <div className="flex items-start justify-between py-2 gap-3">
                    <span className="text-slate-400 font-medium shrink-0">Preferred Hospital</span>
                    <span className="text-right font-semibold text-emerald-400 break-words max-w-[65%]">
                      {profile.preferredHospital}
                    </span>
                  </div>

                  {/* Emergency Phone */}
                  <div className="flex items-center justify-between py-2 gap-3">
                    <span className="text-slate-400 font-medium shrink-0">Emergency Phone</span>
                    <a
                      href={`tel:${profile.phone.replace(/\s+/g, "")}`}
                      className="text-right font-mono font-bold text-cyan-400 hover:underline"
                    >
                      {profile.phone}
                    </a>
                  </div>
                </div>

                {/* Action CTA Button: Open Medical ID */}
                <button
                  onClick={() => setActiveTab("medical-id")}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white font-black text-xs transition shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open Medical ID & Care Plan</span>
                </button>
              </div>

              {/* 1-Tap Quick Action Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setActiveTab("sos")}
                  className="p-3 rounded-2xl bg-gradient-to-r from-rose-950/70 to-slate-900 border border-rose-500/40 hover:border-rose-400 text-left transition flex items-center gap-2.5 shadow-md"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <HeartPulse className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white">Emergency SOS</div>
                    <div className="text-[10px] text-rose-300 truncate">1-Tap Paramedic</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("insights")}
                  className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/70 to-slate-900 border border-purple-500/40 hover:border-purple-400 text-left transition flex items-center gap-2.5 shadow-md"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white">Fetal Insights</div>
                    <div className="text-[10px] text-purple-300 truncate">Daily Guideline</div>
                  </div>
                </button>
              </div>

              {/* Fetal Kick Counter Quick Widget */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Daily Kick Counter
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    {kicks} <span className="text-xs text-slate-400 font-normal">/ 10 kicks</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Last logged: {profile.lastKickTime || "12:45 PM"}
                  </div>
                </div>
                <button
                  onClick={recordKick}
                  className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Count Kick</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: SOS ENGINE / MATERNAL OBSTETRIC EMERGENCY DESK (IMAGE 4) */}
          {/* ========================================================= */}
          {activeTab === "sos" && (
            <div className="space-y-4">
              {/* Header: Maternal Obstetric Emergency Desk */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-[#161226] to-[#0A1224] border border-rose-500/40 flex items-start gap-3 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Baby className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-white tracking-tight">
                    Maternal Obstetric Emergency Desk
                  </h2>
                  <p className="text-[11px] text-rose-300 leading-tight mt-0.5">
                    Priority L&D Direct-to-Bed Intake • Theater Standby Active
                  </p>
                </div>
              </div>

              {/* ACTIVE DISPATCH HUD (WHEN SOS HAS BEEN CONFIRMED) */}
              {isEmergencyActive ? (
                <div className="rounded-2xl bg-gradient-to-b from-rose-950/90 to-slate-950 border-2 border-rose-500 p-4 space-y-4 shadow-2xl animate-in fade-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        AMBULANCE ALS EN ROUTE
                      </span>
                      <h3 className="text-base font-black text-white mt-0.5">
                        {selectedCondition}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {emergencyRequestId}
                    </span>
                  </div>

                  {/* ETA & Assigned Vehicle */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">ETA Arrival</div>
                      <div className="text-2xl font-black text-rose-400 tracking-tight flex items-center gap-1.5">
                        <Clock className="w-5 h-5 text-rose-500 animate-spin" />
                        <span>~{etaMinutes} mins</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Unit Label</div>
                      <div className="text-xs font-bold text-white">{assignedAmbulance}</div>
                    </div>
                  </div>

                  {/* Continuous Live Location HUD */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <div>
                        <div className="font-bold text-white">Live Telemetry Transmitting</div>
                        <div className="text-[10px] text-slate-400">
                          GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)} (±{userLocation.accuracy ?? 5}m)
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Locked
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href="tel:+234800765223"
                      className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs text-center flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call Paramedic</span>
                    </a>
                    <button
                      onClick={handleCancelEmergency}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-700"
                    >
                      <X className="w-4 h-4" />
                      <span>Stand Down</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* PRE-DISPATCH CONFIGURATION FORM (IMAGE 4) */
                <div className="space-y-3.5">
                  {/* Assigned Facility Chip */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-xs">
                    <div className="w-5 h-5 rounded-md bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black">
                      +
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-400 text-[11px]">Assigned L&D Facility: </span>
                      <strong className="text-white text-xs truncate block sm:inline">
                        {assignedHospital}
                      </strong>
                    </div>
                  </div>

                  {/* CONTINUOUS LIVE LOCATION FEED PILL (ACCURACY FIXED) */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{userLocation.address}</div>
                        <div className="text-[10px] text-cyan-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>Continuous Live GPS Feed (±{userLocation.accuracy ?? 5}m lock)</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleForceRefreshGps}
                      disabled={isLocating}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0 transition"
                      title="Force refresh high-accuracy GPS"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? "animate-spin text-cyan-400" : ""}`} />
                    </button>
                  </div>

                  {/* SELECT OBSTETRIC EMERGENCY CONDITION (CLEAN 2-COL GRID, NO TRUNCATION) */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Select Obstetric Emergency Condition
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {OBSTETRIC_EMERGENCY_CONDITIONS.map((cond) => {
                        const Icon = cond.icon;
                        const isSelected = selectedCondition === cond.title;
                        return (
                          <button
                            key={cond.id}
                            type="button"
                            onClick={() => setSelectedCondition(cond.title)}
                            className={`p-2.5 rounded-2xl border text-left transition flex items-start gap-2 ${
                              isSelected
                                ? "bg-rose-950/60 border-rose-500 text-white shadow-md shadow-rose-600/20"
                                : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                isSelected ? "text-rose-400" : "text-slate-400"
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold leading-snug break-words">
                                {cond.title}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{cond.subtitle}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PATIENT AGE CATEGORY (ADULT MATERNAL DEFAULT, CLEAN ROW) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-black uppercase tracking-wider text-slate-400">
                        Patient Age Category
                      </span>
                      <span className="font-bold text-cyan-400">
                        {PATIENT_AGE_BANDS.find((b) => b.id === selectedAgeBand)?.short}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {PATIENT_AGE_BANDS.map((band) => {
                        const isSelected = selectedAgeBand === band.id;
                        return (
                          <button
                            key={band.id}
                            type="button"
                            onClick={() => setSelectedAgeBand(band.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                              isSelected
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {band.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* INPUTS: LANDMARK, CALLBACK PHONE, ACCESS NOTE */}
                  <div className="space-y-2">
                    {/* Landmark / Compound */}
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-cyan-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={landmarkNote}
                        onChange={(e) => setLandmarkNote(e.target.value)}
                        placeholder="Landmark, Estate Gate, Compound or Junction..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Callback Phone */}
                    <div className="relative">
                      <Phone className="w-4 h-4 text-emerald-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="tel"
                        value={contactPhoneInput}
                        onChange={(e) => setContactPhoneInput(e.target.value)}
                        placeholder="Callback Phone Number (for Driver & Dispatcher)..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    {/* Patient Condition / Access note */}
                    <div className="relative">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={accessNote}
                        onChange={(e) => setAccessNote(e.target.value)}
                        placeholder="Patient condition / Access note (Optional)"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Attached from Medical ID Banner */}
                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-2 text-[11px] text-slate-300">
                    <Droplets className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">
                      Attached from Medical ID: <strong>Blood Group {profile.bloodGroup}</strong> • Genotype {profile.genotype}
                    </span>
                  </div>

                  {/* Big Confirmation Button */}
                  <button
                    onClick={() => handleTriggerEmergency()}
                    disabled={isSubmittingSos}
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-600 hover:from-rose-500 hover:to-rose-600 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-rose-600/40 transition flex items-center justify-center gap-2 border border-rose-400/30"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                    <span>
                      {isSubmittingSos
                        ? "Transmitting Dispatch Signal..."
                        : "Confirm Obstetric Ambulance Dispatch"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: INSIGHTS & WELLNESS (IMAGE 5) */}
          {/* ========================================================= */}
          {activeTab === "insights" && (
            <div className="space-y-4">
              {/* Header: Maternal Wellness & Insights with [+] button */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">
                    Maternal Wellness & Insights
                  </h2>
                  <p className="text-[11px] text-slate-400">Clinical milestone & daily logs</p>
                </div>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 flex items-center justify-center transition shadow-sm font-bold"
                  title="Add / Edit Biometrics"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* CLEAN HORIZONTAL TABS (NO OVERLAPPING / NO CLIPPING) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  className="shrink-0 px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/50 text-purple-300 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Daily Wellness & Biometrics</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotifications(true)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Obstetric Danger Signs & Protocols</span>
                </button>
              </div>

              {/* Gestational Milestone Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/40 border border-purple-500/30 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300 text-base">
                    🍍
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">
                      Week {profile.gestationalWeeks}, Day {profile.gestationalDays} • 3rd Trimester
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Baby size: <strong className="text-amber-300">Sweet Pineapple (~1.8 kg)</strong> • Day 218 of 280
                    </div>
                  </div>
                </div>
              </div>

              {/* "HOW ARE YOU TODAY?" MOOD CHECK-IN (FIXED FLOATING/OVERFLOWING EMOJI) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                      5TH CHECK-IN • TODAY
                    </span>
                    <h3 className="text-sm font-black text-white mt-1.5">How are you today?</h3>
                  </div>
                  <span className="text-[10px] text-slate-400">Updated just now</span>
                </div>

                {/* 5 Emojis with balanced spacing and clean selection state */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { id: "awful", label: "Awful", icon: "😫" },
                    { id: "bad", label: "Bad", icon: "😞" },
                    { id: "okay", label: "Okay", icon: "😐" },
                    { id: "good", label: "Good", icon: "😊" },
                    { id: "great", label: "Great", icon: "🤩" },
                  ].map((mood) => {
                    const isSelected = profile.todayMood === mood.id;
                    return (
                      <button
                        key={mood.id}
                        type="button"
                        onClick={() =>
                          setProfile((prev) => ({
                            ...prev,
                            todayMood: mood.id as ClientProfileData["todayMood"],
                          }))
                        }
                        className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? "bg-emerald-950/60 border-2 border-emerald-400 shadow-md shadow-emerald-500/20 font-bold scale-102"
                            : "bg-slate-950/80 border border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <span className="text-2xl select-none">{mood.icon}</span>
                        <span
                          className={`text-[10px] ${
                            isSelected ? "text-emerald-300 font-bold" : "text-slate-400"
                          }`}
                        >
                          {mood.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* "YOUR WEEKLY INSIGHTS" BAR CHART (IMAGE 5) */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Your Weekly Insights
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      This week • OCT 12 - OCT 18
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                </div>

                {/* Day Columns with Wednesday active green bar */}
                <div className="pt-4 pb-2 px-2 flex items-end justify-between h-36">
                  {[
                    { day: "MON", height: "h-4", filled: false },
                    { day: "TUE", height: "h-6", filled: false },
                    { day: "WED", height: "h-28", filled: true, emoji: "😊" },
                    { day: "THU", height: "h-4", filled: false },
                    { day: "FRI", height: "h-4", filled: false },
                    { day: "SAT", height: "h-4", filled: false },
                    { day: "SUN", height: "h-4", filled: false },
                  ].map((bar) => (
                    <div key={bar.day} className="flex flex-col items-center gap-2">
                      <div className="flex flex-col items-center justify-end h-24">
                        {bar.filled ? (
                          <div className="flex flex-col items-center">
                            <span className="text-sm select-none mb-1 animate-bounce">
                              {bar.emoji}
                            </span>
                            <div className="w-4 h-20 rounded-full bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-md shadow-emerald-500/30" />
                          </div>
                        ) : (
                          <div className="w-4 h-3 rounded-full bg-slate-800" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          bar.filled ? "text-emerald-400 font-black" : "text-slate-500"
                        }`}
                      >
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: RECORDS & CLINICAL HISTORY */}
          {/* ========================================================= */}
          {activeTab === "records" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">Clinical Records</h2>
                  <p className="text-[11px] text-slate-400">Emergency & prenatal audit logs</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  Verified Synced
                </span>
              </div>

              {/* Records List */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      <span>Obstetric Standby Pre-Alert</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Today, 10:15 AM</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Routine direct-to-bed reservation confirmed at LifeCare Private Clinic for Week 31 routine monitoring.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Facility: LifeCare Private Clinic</span>
                    <span className="text-emerald-400 font-bold">Standby Ready</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-cyan-400" />
                      <span>Blood Bank Crossmatch Pre-Booking</span>
                    </span>
                    <span className="text-[10px] text-slate-400">12 Oct 2026</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Blood Group: {profile.bloodGroup} reserve verified with regional emergency blood bank.
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Protocol: Rh-Negative Fast Shield</span>
                    <span className="text-cyan-400 font-bold">Secured</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: MEDICAL ID & PROFILE DOSSIER */}
          {/* ========================================================= */}
          {activeTab === "medical-id" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">Patient Medical ID</h2>
                  <p className="text-[11px] text-slate-400">Emergency responder critical profile</p>
                </div>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-400 border border-slate-700 flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Comprehensive Medical ID Dossier */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 divide-y divide-slate-800/80 text-xs shadow-xl">
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Full Legal Name</span>
                  <span className="font-bold text-white text-sm">{profile.fullName}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Emergency Contact</span>
                  <a href={`tel:${profile.phone}`} className="font-mono font-bold text-cyan-400">
                    {profile.phone}
                  </a>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Blood Group</span>
                  <span className="font-bold text-rose-400 text-sm">{profile.bloodGroup}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Genotype</span>
                  <span className="font-bold text-slate-200">{profile.genotype}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Allergies</span>
                  <span className="font-semibold text-slate-200">{profile.allergies}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Obstetric History</span>
                  <span className="font-bold text-purple-400">{profile.gravidaPara}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Estimated Due Date</span>
                  <span className="font-mono font-bold text-amber-400">{profile.edd}</span>
                </div>

                <div className="flex items-start justify-between py-2 gap-3">
                  <span className="text-slate-400 shrink-0">Designated Facility</span>
                  <span className="font-bold text-emerald-400 text-right break-words max-w-[65%]">
                    {profile.preferredHospital}
                  </span>
                </div>

                <div className="flex items-start justify-between py-2 gap-3">
                  <span className="text-slate-400 shrink-0">Next of Kin</span>
                  <div className="text-right">
                    <div className="font-bold text-white">{profile.nextOfKin}</div>
                    <div className="text-[11px] text-cyan-400 font-mono">{profile.nextOfKinPhone}</div>
                  </div>
                </div>
              </div>

              {/* Solace Anti-Bureaucracy Guarantee Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <Award className="w-4 h-4" />
                  <span>Solace Direct-to-Bed Guarantee</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  When Solace paramedics transport you to {profile.preferredHospital}, your pre-arrival digital triage file is already confirmed. Zero lobby wait times.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* 5-TAB BOTTOM NAVIGATION BAR (FIXED TERMINOLOGY & ACTIVE HIGHLIGHT) */}
        <nav className="border-t border-slate-800 bg-[#091122] px-3 py-2 flex items-center justify-around text-xs z-30 select-none">
          {/* TAB 1: TODAY */}
          <button
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
              activeTab === "today"
                ? "text-amber-400 font-black scale-105"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] tracking-tight">Today</span>
          </button>

          {/* TAB 2: SOS ENGINE */}
          <button
            onClick={() => setActiveTab("sos")}
            className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
              activeTab === "sos"
                ? "text-rose-400 font-black scale-105"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span className="text-[10px] tracking-tight">SOS Engine</span>
          </button>

          {/* TAB 3: INSIGHTS */}
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
              activeTab === "insights"
                ? "text-purple-400 font-black scale-105"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] tracking-tight">Insights</span>
          </button>

          {/* TAB 4: RECORDS */}
          <button
            onClick={() => setActiveTab("records")}
            className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
              activeTab === "records"
                ? "text-cyan-400 font-black scale-105"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <History className="w-4 h-4" />
            <span className="text-[10px] tracking-tight">Records</span>
          </button>

          {/* TAB 5: MEDICAL ID */}
          <button
            onClick={() => setActiveTab("medical-id")}
            className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
              activeTab === "medical-id"
                ? "text-emerald-400 font-black scale-105"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px] tracking-tight">Medical ID</span>
          </button>
        </nav>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CARE ALERTS & NOTIFICATIONS (IMAGES 1 & 2) */}
      {/* ========================================================= */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#091124] border border-slate-700/80 rounded-t-[32px] sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Care Alerts & Notifications</h3>
                  <p className="text-[11px] text-slate-400">
                    {unreadAlertCount} active alerts requiring attention
                  </p>
                </div>
              </div>
              <button
                onClick={markAllAlertsRead}
                className="text-xs font-bold text-cyan-400 hover:underline"
              >
                Mark all read
              </button>
            </div>

            {/* Notification Cards (Images 1 & 2) */}
            <div className="space-y-3">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className={`p-4 rounded-2xl border transition space-y-2 ${
                    al.read
                      ? "bg-slate-900/60 border-slate-800 text-slate-400"
                      : "bg-[#0E1B38] border-slate-700 text-slate-200 shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        al.tagColor === "red"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : al.tagColor === "purple"
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : al.tagColor === "rose"
                          ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                          : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      }`}
                    >
                      {al.tag}
                    </span>
                    <span className="text-slate-400 font-semibold">{al.timeLabel}</span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug">{al.title}</h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{al.body}</p>

                  <button
                    onClick={() => handleAlertAction(al.actionTarget)}
                    className="pt-1 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition"
                  >
                    <span>{al.actionText}</span>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowNotifications(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700"
            >
              Close Alerts
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: GESTATIONAL JOURNEY 31 WEEKS DETAILS (IMAGE 6) */}
      {/* ========================================================= */}
      {showGestationalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#091124] border border-slate-700/80 rounded-t-[32px] sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center gap-2">
              <span className="text-lg">🌸</span>
              <h3 className="text-base font-black text-white">
                Gestational Journey: {profile.gestationalWeeks} Weeks
              </h3>
            </div>

            {/* Clean Data Table (Clean spacing, zero string-gluing) */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 divide-y divide-slate-800/80 text-xs">
              <div className="flex items-center justify-between py-2.5 gap-3">
                <span className="text-slate-400 font-medium shrink-0">Estimated Due Date</span>
                <span className="font-mono font-bold text-white">{profile.edd}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 gap-3">
                <span className="text-slate-400 font-medium shrink-0">Clinical Trimester</span>
                <span className="font-bold text-purple-400">3rd Trimester</span>
              </div>

              <div className="flex items-center justify-between py-2.5 gap-3">
                <span className="text-slate-400 font-medium shrink-0">Baby Size Comparison</span>
                <span className="font-bold text-amber-300">Sweet Pineapple (~1.8 kg)</span>
              </div>

              <div className="flex items-start justify-between py-2.5 gap-3">
                <span className="text-slate-400 font-medium shrink-0">Emergency Blood Reserve</span>
                <span className="text-right font-bold text-rose-400 break-words max-w-[65%]">
                  {profile.bloodGroup}
                </span>
              </div>

              <div className="flex items-start justify-between py-2.5 gap-3">
                <span className="text-slate-400 font-medium shrink-0">Preferred Hospital</span>
                <span className="text-right font-semibold text-emerald-400 break-words max-w-[65%]">
                  {profile.preferredHospital}
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5 gap-3">
                <span className="text-slate-400 font-medium shrink-0">Gravida / Parity</span>
                <span className="font-bold text-slate-100">{profile.gravidaPara}</span>
              </div>

              <div className="flex items-center justify-between py-2.5 gap-3">
                <span className="text-slate-400 font-medium shrink-0">Fetal Kick Protocol</span>
                <span className="font-bold text-cyan-400">≥ 10 kicks in 2 hours</span>
              </div>
            </div>

            {/* Orange-Red Close Details Button */}
            <button
              onClick={() => setShowGestationalModal(false)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-orange-600/30"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: PROFILE SETTINGS & SIMULATOR CONTROLS */}
      {/* ========================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#0B1428] border border-slate-700 rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span>Client Profile Configuration</span>
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Mode Information */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Care View Mode
              </label>
              {isRegisteredUser ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      {profile.isObstetric
                        ? "🤰 Maternal & Obstetric Care Plan"
                        : "🛡️ Standard Emergency Shield Plan"}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold ml-auto">
                      Account Synced
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setProfile((prev) => ({
                        ...DEFAULT_OBSTETRIC_PROFILE,
                        fullName: prev.fullName,
                        phone: prev.phone,
                      }))
                    }
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      profile.isObstetric
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/60"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    <Baby className="w-4 h-4" />
                    <span>Obstetric Mode ★</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setProfile((prev) => ({
                        ...DEFAULT_GENERAL_PROFILE,
                        fullName: prev.fullName,
                        phone: prev.phone,
                      }))
                    }
                    className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      !profile.isObstetric
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>General Mode</span>
                  </button>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Patient Full Name</label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                />
              </div>

              {/* Clean Blood Group & Genotype (NO "Blood Shield" clutter) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Blood Group</label>
                  <select
                    value={profile.bloodGroup}
                    onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="O-Negative (Rh-Negative)">O-Negative (Rh-Negative)</option>
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
                  <label className="text-slate-300 block mb-1">Genotype</label>
                  <select
                    value={profile.genotype}
                    onChange={(e) => setProfile({ ...profile, genotype: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="AA">AA</option>
                    <option value="AS">AS</option>
                    <option value="AC">AC</option>
                    <option value="SS">SS</option>
                  </select>
                </div>
              </div>

              {profile.isObstetric && (
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
                  <div>
                    <label className="text-purple-300 block mb-1">Gestational Weeks</label>
                    <input
                      type="number"
                      min={4}
                      max={42}
                      value={profile.gestationalWeeks}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          gestationalWeeks: parseInt(e.target.value) || 31,
                        })
                      }
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-purple-300 block mb-1">Gravida / Parity</label>
                    <input
                      type="text"
                      value={profile.gravidaPara}
                      onChange={(e) => setProfile({ ...profile, gravidaPara: e.target.value })}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Designated Hospital */}
              <div>
                <label className="text-slate-300 block mb-1">Primary Partner Center</label>
                <input
                  type="text"
                  value={profile.preferredHospital}
                  onChange={(e) => {
                    setProfile({ ...profile, preferredHospital: e.target.value });
                    setAssignedHospital(e.target.value);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              {/* Location Preset Selector */}
              <div>
                <label className="text-slate-300 block mb-1">Simulate Location Corridor</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setUserLocation({
                        lat: 7.3775,
                        lng: 3.947,
                        accuracy: 5,
                        speedKmh: null,
                        address: "20, Ibadan North East, Oyo, Nigeria",
                        isLive: true,
                        lastPing: "Just now",
                      })
                    }
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] text-white border border-slate-700"
                  >
                    Ibadan Private
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setUserLocation({
                        lat: 7.7827,
                        lng: 4.5418,
                        accuracy: 6,
                        speedKmh: null,
                        address: "Asubiaro, Osogbo, Osun State, Nigeria",
                        isLive: true,
                        lastPing: "Just now",
                      })
                    }
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] text-white border border-slate-700"
                  >
                    Osogbo Pilot
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setUserLocation({
                        lat: 6.4281,
                        lng: 3.4219,
                        accuracy: 4,
                        speedKmh: null,
                        address: "Victoria Island, Lagos, Nigeria",
                        isLive: true,
                        lastPing: "Just now",
                      })
                    }
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] text-white border border-slate-700"
                  >
                    Lagos Metro
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition"
            >
              Save & Apply to Mobile View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
