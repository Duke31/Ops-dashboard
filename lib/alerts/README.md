# Solace Ops Dashboard Multi-Desk Alert System

## Overview
Every operational desk (`admin`, `dispatcher`, `hospital`, `driver`) receives immediate audible and push-style desktop alerts when an emergency request becomes relevant to them, even if the browser tab is hidden in the background or the user is looking at another window or site.

## Architecture
The alert system consists of:
1. **`lib/alerts/deskAlerts.ts`**:
   - **Web Audio API Chime**: Generates synthesized tones without relying on static MP3 asset loading (`urgent`, `new`, `assign`, `status`).
   - **Browser Notification API**: Dispatches system notifications tagged with `solace-${requestId}-${eventKey}` to prevent infinite notification stacking while ensuring alert visibility when the tab is in the background. Clicking a notification automatically focuses the window and navigates to the respective desk (`/admin`, `/dispatcher`, `/hospital`, `/driver`).
   - **Tab Title Flasher**: Flashes `🚨 {Alert Details}` in the browser tab title for background tab discovery.
   - **Supabase Realtime**: Subscribes to `emergency_requests` changes (`INSERT` and `UPDATE`) and `driver_tactical_alert` broadcast events. Client-side role filters ensure strict adherence to existing RLS:
     - `admin` & `dispatcher`: Notified of all new requests, status transitions, and tactical alerts.
     - `hospital`: Notified only when their assigned `hospital_id` matches the request or transitions into intake phases.
     - `driver`: Notified only when their linked `driver_id` is assigned or updated.
   - **Debouncing**: Events for the same request and event key are debounced within an 8.5-second window to prevent duplicate sound triggers from rapid database updates.

2. **`components/alerts/DeskAlertProvider.tsx`**:
   - Manages global audio/notification permissions and autoplay unlocks.
   - Displays a sticky non-blocking banner until the operator clicks **"Enable Alerts"** (or dismisses).
   - Tracks away alerts when `document.hidden === true` and displays a subtle summary toast when returning to the tab.
   - Tracks `highlightedRequestId` to render visual pulse highlights on relevant request cards across `RequestBoard`, `HospitalCards`, and `DriverConsole`.

3. **`components/AppShell.tsx`**:
   - Includes quick-access **Mute Toggle** (`ops_alerts_muted` in `localStorage`) and **⚡ Test Alert** button in the top navigation bar of every desk view.

## Browser Autoplay & Background Tab Limits

1. **Autoplay Policy**:
   - Modern browsers (Chrome, Edge, Firefox, Safari) prevent audio playback until the user interacts with the page (click/touch).
   - Clicking **"Enable Alerts"** or **"⚡ Test"** resumes the Web Audio `AudioContext`.

2. **Background Audio Throttling**:
   - Background tabs may suspend `AudioContext` or throttle timers.
   - The system couples audio chimes with the **Browser Notification API**, which is guaranteed by the OS and browser to display even when the browser window is minimized or behind other applications.

3. **iOS Safari / Mobile Constraints**:
   - iOS Safari does not support the Web Notification API in standard browser tabs unless installed as a PWA (Web App to Home Screen) in iOS 16.4+.
   - Sound on iOS requires an active user gesture on the page to start audio contexts.
