"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  isAlertMuted,
  playDeskChime,
  requestAlertPermission,
  subscribeDeskAlerts,
  toggleAlertMuted,
  type AlertKind,
} from "@/lib/alerts/deskAlerts";

interface DeskAlertContextType {
  muted: boolean;
  toggleMute: () => void;
  playTestAlert: (kind?: AlertKind) => void;
  requestPermission: () => Promise<void>;
  permissionGranted: boolean;
  recentAlertsCount: number;
  highlightedRequestId: string | null;
}

const DeskAlertContext = createContext<DeskAlertContextType>({
  muted: false,
  toggleMute: () => {},
  playTestAlert: () => {},
  requestPermission: async () => {},
  permissionGranted: false,
  recentAlertsCount: 0,
  highlightedRequestId: null,
});

export function useDeskAlerts() {
  return useContext(DeskAlertContext);
}

export function DeskAlertProvider({
  profile,
  driverUnitId,
  children,
}: {
  profile: Profile;
  driverUnitId?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [muted, setMuted] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [awayAlertsCount, setAwayAlertsCount] = useState(0);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);

  // Sync mute state from localStorage
  useEffect(() => {
    setMuted(isAlertMuted());
  }, []);

  // Check Notification permission state
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionGranted(Notification.permission === "granted");
    }
    try {
      const dismissed = sessionStorage.getItem("ops_alert_banner_dismissed");
      if (dismissed === "true") setBannerDismissed(true);
    } catch {}
  }, []);

  // Listen to visibility changes: count missed alerts while away and notify when returning
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && awayAlertsCount > 0) {
        // Clear away count after brief toast window
        const timer = setTimeout(() => {
          setAwayAlertsCount(0);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [awayAlertsCount]);

  // Subscribe to real-time desk alerts
  useEffect(() => {
    const cleanup = subscribeDeskAlerts({
      profile,
      supabase,
      driverUnitId,
      onAlertFired: ({ requestId, kind }) => {
        setHighlightedRequestId(requestId);
        setTimeout(() => {
          setHighlightedRequestId((prev) => (prev === requestId ? null : prev));
        }, 8000);

        if (document.hidden) {
          setAwayAlertsCount((c) => c + 1);
        }
      },
      onRefresh: () => {
        router.refresh();
      },
    });

    return () => {
      cleanup();
    };
  }, [profile, supabase, driverUnitId, router]);

  async function handleRequestPermission() {
    const res = await requestAlertPermission();
    if (res.notificationGranted) {
      setPermissionGranted(true);
    }
    playDeskChime("new");
  }

  function handleDismissBanner() {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem("ops_alert_banner_dismissed", "true");
    } catch {}
  }

  function handleToggleMute() {
    const next = toggleAlertMuted();
    setMuted(next);
  }

  function handlePlayTestAlert(kind: AlertKind = "urgent") {
    playDeskChime(kind);
  }

  const showBanner = !permissionGranted && !bannerDismissed;

  return (
    <DeskAlertContext.Provider
      value={{
        muted,
        toggleMute: handleToggleMute,
        playTestAlert: handlePlayTestAlert,
        requestPermission: handleRequestPermission,
        permissionGranted,
        recentAlertsCount: awayAlertsCount,
        highlightedRequestId,
      }}
    >
      {/* Sticky First-Run Alert Activation Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-3 shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">🔔</span>
            <span className="truncate">
              Enable sound & desktop push alerts to hear incoming emergencies even when this tab is
              in the background.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1 rounded bg-white text-amber-900 font-bold hover:bg-amber-100 transition shadow-sm text-xs"
            >
              Enable Alerts
            </button>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="text-white/80 hover:text-white px-2 py-1 text-xs"
              title="Dismiss for this session"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Away Toast Notification */}
      {awayAlertsCount > 0 && !document.hidden && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-2.5 rounded-lg shadow-xl border border-white/20 dark:border-black/20 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span>🚨</span>
          <span>{awayAlertsCount} emergency updates occurred while away from tab</span>
          <button
            type="button"
            onClick={() => setAwayAlertsCount(0)}
            className="ml-2 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {children}
    </DeskAlertContext.Provider>
  );
}
