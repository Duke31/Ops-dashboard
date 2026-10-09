import type { AppRole, Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AlertKind = "new" | "assign" | "urgent" | "status";

let audioCtxInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtxInstance) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtxInstance = new AudioCtx();
    }
  }
  return audioCtxInstance;
}

/**
 * Checks if user has muted alerts in localStorage.
 */
export function isAlertMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("ops_alerts_muted") === "true";
  } catch {
    return false;
  }
}

/**
 * Toggles mute status and returns the next value.
 */
export function toggleAlertMuted(): boolean {
  if (typeof window === "undefined") return false;
  const next = !isAlertMuted();
  try {
    localStorage.setItem("ops_alerts_muted", next ? "true" : "false");
  } catch {}
  return next;
}

/**
 * Requests Notification permission and unlocks Web Audio AudioContext after user gesture.
 */
export async function requestAlertPermission(): Promise<{
  notificationGranted: boolean;
  audioUnlocked: boolean;
}> {
  let notificationGranted = false;
  let audioUnlocked = false;

  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      const res = await Notification.requestPermission();
      notificationGranted = res === "granted";
    } catch {
      notificationGranted = Notification.permission === "granted";
    }
  }

  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      audioUnlocked = ctx.state === "running";
    } catch {
      audioUnlocked = false;
    }
  }

  return { notificationGranted, audioUnlocked };
}

/**
 * Synthesizes a non-annoying Web Audio chime for the specific event kind.
 */
export function playDeskChime(kind: AlertKind = "status") {
  if (typeof window === "undefined") return;
  if (isAlertMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === "urgent") {
      // Rapid urgent double chime: 950Hz -> 650Hz -> 950Hz -> 650Hz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.setValueAtTime(650, now + 0.12);
      osc.frequency.setValueAtTime(950, now + 0.24);
      osc.frequency.setValueAtTime(650, now + 0.36);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (kind === "new") {
      // Upbeat dispatch alert: 523.25 (C5) -> 659.25 (E5) -> 783.99 (G5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (kind === "assign") {
      // Soft attention tone: two pleasant bell chords
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.15); // A5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Mild status transition chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch {
    // Autoplay restrictions or background throttle
  }
}

/**
 * Fires native desktop notification with click routing.
 */
export function showDesktopNotification({
  title,
  body,
  tag,
  href,
}: {
  title: string;
  body: string;
  tag?: string;
  href?: string;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      tag: tag || "solace-ems-alert",
      icon: "/solace_icon.png",
      requireInteraction: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (href && window.location.pathname !== href) {
        window.location.href = href;
      }
    };
  } catch {
    // Some mobile browsers throw on new Notification()
  }
}

// Memory debounce map to prevent double-firing within 8-10 seconds
const recentAlerts = new Map<string, number>();
const DEBOUNCE_MS = 8500;

function isDebounced(requestId: string, eventKey: string): boolean {
  const key = `${requestId}:${eventKey}`;
  const now = Date.now();
  const last = recentAlerts.get(key);
  if (last && now - last < DEBOUNCE_MS) {
    return true;
  }
  recentAlerts.set(key, now);

  // Periodic cleanup
  if (recentAlerts.size > 200) {
    for (const [k, time] of recentAlerts.entries()) {
      if (now - time > DEBOUNCE_MS * 2) {
        recentAlerts.delete(k);
      }
    }
  }
  return false;
}

// Temporary tab title flasher
let titleInterval: NodeJS.Timeout | null = null;
let originalTitle = typeof document !== "undefined" ? document.title : "Solace EMS";

export function flashTabTitle(alertText: string) {
  if (typeof document === "undefined") return;
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  originalTitle = originalTitle.includes("🚨") ? "Solace EMS Ops" : document.title;
  let toggle = false;
  let count = 0;

  titleInterval = setInterval(() => {
    if (count++ > 14) {
      if (titleInterval) clearInterval(titleInterval);
      titleInterval = null;
      document.title = originalTitle;
      return;
    }
    document.title = toggle ? `🚨 ${alertText}` : originalTitle;
    toggle = !toggle;
  }, 800);
}

/**
 * Subscribes to emergency_requests changes and driver tactical alerts for the desk role.
 */
export function subscribeDeskAlerts({
  profile,
  supabase,
  driverUnitId,
  onAlertFired,
  onRefresh,
}: {
  profile: Profile;
  supabase: SupabaseClient;
  driverUnitId?: string | null;
  onAlertFired?: (info: { requestId: string; kind: AlertKind; message: string }) => void;
  onRefresh?: () => void;
}) {
  const role: AppRole = profile.role;
  const targetHospitalId = profile.hospital_id;
  const deskRoute =
    role === "driver"
      ? "/driver"
      : role === "hospital"
      ? "/hospital"
      : role === "dispatcher"
      ? "/dispatcher"
      : "/admin";

  const triggerAlert = ({
    requestId,
    eventKey,
    kind,
    title,
    body,
  }: {
    requestId: string;
    eventKey: string;
    kind: AlertKind;
    title: string;
    body: string;
  }) => {
    if (isDebounced(requestId, eventKey)) return;

    playDeskChime(kind);
    showDesktopNotification({
      title,
      body,
      tag: `solace-${requestId}-${eventKey}`,
      href: deskRoute,
    });
    flashTabTitle(title);

    if (onAlertFired) {
      onAlertFired({ requestId, kind, message: `${title}: ${body}` });
    }
  };

  const channel = supabase
    .channel(`desk-alerts-${role}-${profile.user_id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "emergency_requests" },
      (payload) => {
        const req = payload.new as Record<string, unknown>;
        if (!req || !req.id) return;
        const reqId = String(req.id);
        const emergencyType = (req.emergency_type as string) || "Emergency Call";
        const priority = req.priority;
        const isUrgent = priority === 1 || priority === "1" || !!req.tactical_alert;

        if (role === "admin" || role === "dispatcher") {
          triggerAlert({
            requestId: reqId,
            eventKey: "insert",
            kind: isUrgent ? "urgent" : "new",
            title: isUrgent ? "🚨 Urgent Emergency Dispatch" : "New Emergency Request",
            body: `${emergencyType} • Priority ${priority || "Standard"} • ${
              (req.patient_address as string) || "Location pending"
            }`,
          });
        } else if (role === "hospital" && targetHospitalId && req.hospital_id === targetHospitalId) {
          triggerAlert({
            requestId: reqId,
            eventKey: "insert-assigned",
            kind: isUrgent ? "urgent" : "assign",
            title: "Incoming Emergency Request",
            body: `${emergencyType} • Direct facility intake assigned`,
          });
        }
        if (onRefresh) onRefresh();
      },
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "emergency_requests" },
      (payload) => {
        const oldRow = (payload.old || {}) as Record<string, unknown>;
        const newRow = (payload.new || {}) as Record<string, unknown>;
        if (!newRow || !newRow.id) return;

        const reqId = String(newRow.id);
        const oldStatus = (oldRow.status as string) || "";
        const newStatus = (newRow.status as string) || "";
        const oldHosp = (oldRow.hospital_id as string) || null;
        const newHosp = (newRow.hospital_id as string) || null;
        const oldDriver = (oldRow.driver_id as string) || null;
        const newDriver = (newRow.driver_id as string) || null;
        const tacticalAlert = (newRow.tactical_alert as string) || null;
        const tacticalAck = !!newRow.tactical_alert_ack;
        const isUrgent =
          newRow.priority === 1 ||
          newRow.priority === "1" ||
          (tacticalAlert && !tacticalAck);

        const typeLabel = (newRow.emergency_type as string) || "Emergency";

        // 1. Tactical Alert check
        if (tacticalAlert && !tacticalAck && (!oldRow.tactical_alert || oldRow.tactical_alert !== tacticalAlert)) {
          let shouldAlert = false;
          if (role === "admin" || role === "dispatcher") shouldAlert = true;
          if (role === "hospital" && targetHospitalId && newHosp === targetHospitalId) shouldAlert = true;
          if (role === "driver" && driverUnitId && newDriver === driverUnitId) shouldAlert = true;

          if (shouldAlert) {
            triggerAlert({
              requestId: reqId,
              eventKey: "tactical-alert",
              kind: "urgent",
              title: "🚨 Tactical Driver Alert!",
              body: `${typeLabel}: ${tacticalAlert}`,
            });
            if (onRefresh) onRefresh();
            return;
          }
        }

        // 2. Hospital Assignment / Confirmation
        if (newHosp && (newHosp !== oldHosp || (!oldStatus.includes("Hospital") && newStatus.includes("Hospital")))) {
          if (role === "hospital" && targetHospitalId === newHosp) {
            triggerAlert({
              requestId: reqId,
              eventKey: `hosp-assigned-${newStatus}`,
              kind: isUrgent ? "urgent" : "assign",
              title: "Hospital Intake Assigned",
              body: `${typeLabel} confirmed for your facility • Status: ${newStatus}`,
            });
          } else if (role === "admin" || role === "dispatcher") {
            triggerAlert({
              requestId: reqId,
              eventKey: `hosp-assigned-desk-${newStatus}`,
              kind: "assign",
              title: "Hospital Confirmed",
              body: `${typeLabel} assigned to receiving hospital`,
            });
          }
        }

        // 3. Driver Assignment
        if (newDriver && (newDriver !== oldDriver || (!oldStatus.includes("Driver") && newStatus.includes("Driver")))) {
          if (role === "driver" && driverUnitId === newDriver) {
            triggerAlert({
              requestId: reqId,
              eventKey: "driver-assigned-self",
              kind: isUrgent ? "urgent" : "new",
              title: "🚑 New Mission Dispatched to Your Unit",
              body: `${typeLabel} • ${newRow.patient_address || "Proceed to patient"}`,
            });
          } else if (role === "admin" || role === "dispatcher") {
            triggerAlert({
              requestId: reqId,
              eventKey: `driver-assigned-desk-${newStatus}`,
              kind: "assign",
              title: "Ambulance Dispatched",
              body: `${typeLabel} responder assigned`,
            });
          }
        }

        // 4. Status Progress (e.g., En route, Arrived, Patient picked up, Completed, Cancelled)
        if (newStatus && newStatus !== oldStatus) {
          const isFinished = ["Cancelled", "Resolved", "Completed", "Admitted"].some((term) =>
            newStatus.toLowerCase().includes(term.toLowerCase()),
          );
          const kind: AlertKind = isUrgent ? "urgent" : isFinished ? "status" : "status";

          if (role === "admin" || role === "dispatcher") {
            triggerAlert({
              requestId: reqId,
              eventKey: `status-${newStatus}`,
              kind,
              title: `Mission: ${newStatus}`,
              body: `${typeLabel} • ${newRow.patient_address || ""}`,
            });
          } else if (role === "hospital" && targetHospitalId && newHosp === targetHospitalId) {
            triggerAlert({
              requestId: reqId,
              eventKey: `status-hosp-${newStatus}`,
              kind,
              title: `Incoming Patient: ${newStatus}`,
              body: `${typeLabel} status updated to ${newStatus}`,
            });
          } else if (role === "driver" && driverUnitId && newDriver === driverUnitId) {
            triggerAlert({
              requestId: reqId,
              eventKey: `status-driver-${newStatus}`,
              kind,
              title: `Dispatch Update: ${newStatus}`,
              body: `${typeLabel} updated to ${newStatus}`,
            });
          }
        }

        if (onRefresh) onRefresh();
      },
    )
    .on("broadcast", { event: "driver_tactical_alert" }, (payload: { payload?: Record<string, unknown> }) => {
      const data = payload?.payload;
      if (data?.request_id && typeof data.request_id === "string") {
        const reqId = data.request_id;
        triggerAlert({
          requestId: reqId,
          eventKey: "tactical-broadcast",
          kind: "urgent",
          title: "🚨 URGENT DRIVER TACTICAL ALERT",
          body: `${(data.driver_name as string) || "Unit"}: ${
            (data.alert_message as string) || "Emergency on route"
          }`,
        });
        if (onRefresh) onRefresh();
      }
    })
    .subscribe();

  // Backup poll every 18 seconds in case Realtime drops or wakes up from background sleep
  const pollTimer = setInterval(() => {
    if (typeof document !== "undefined" && !document.hidden && onRefresh) {
      onRefresh();
    }
  }, 18000);

  return () => {
    supabase.removeChannel(channel);
    clearInterval(pollTimer);
    if (titleInterval) {
      clearInterval(titleInterval);
      titleInterval = null;
      if (typeof document !== "undefined") {
        document.title = originalTitle;
      }
    }
  };
}
