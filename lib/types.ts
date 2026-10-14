export type AppRole = "dispatcher" | "hospital" | "admin" | "driver" | "client";

export const APP_ROLES: AppRole[] = [
  "dispatcher",
  "hospital",
  "admin",
  "driver",
  "client",
];

export type Profile = {
  user_id: string;
  role: AppRole;
  hospital_id: string | null;
  display_name: string | null;
  email?: string | null;
};

export type Hospital = {
  id: string;
  name: string;
  address: string | null;
  available_capacity: number | null;
  lat?: number | null;
  lng?: number | null;
  intake_phone?: string | null;
  created_at?: string;
  // Extended multi-network and capability matrix fields
  region_cluster?: string | null;
  facility_tier?: string | null;
  theater_status?: "ready" | "in_use" | "standby" | null;
  blood_bank_status?: "active" | "limited" | "exhausted" | null;
  specialties?: string[] | null;
  verified_by?: string | null;
  verified_at?: string | null;
};

export type Driver = {
  id: string;
  display_name: string | null;
  vehicle_label: string | null;
  hospital_id: string | null;
  active?: boolean | null;
  status?: string | null;
  duty_status?: "on_duty" | "off_duty" | string | null;
  fcm_token?: string | null;
  last_active_at?: string | null;
  user_id?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
  last_location_at?: string | null;
  battery_level?: number | null;
  is_charging?: boolean | null;
  network_type?: string | null;
  heading?: number | null;
  speed?: number | null;
};

export type EmergencyRequest = {
  id: string;
  patient_address: string | null;
  origin: string | null;
  patient_lat: number | null;
  patient_lng: number | null;
  emergency_type: string | null;
  status: string;
  created_at: string;
  hospital_id: string | null;
  driver_id: string | null;
  notes: string | null;
  contact_phone?: string | null;
  patient_age_band?: string | null;
  completed_at: string | null;
  priority: string | number | null;
  hospital?: Hospital | null;
  driver?: Driver | null;
  tactical_alert?: string | null;
  tactical_alert_code?: string | null;
  tactical_alert_at?: string | null;
  tactical_alert_ack?: boolean | null;
  dispatcher_response?: string | null;
  dispatcher_response_at?: string | null;
  // Multi-cluster and clinical handover metadata
  region_cluster?: string | null;
  escalation_tier?: number | null;
  escalated_to?: string | null;
};

export type TransitionRule = {
  from_status: string;
  to_status: string;
  actor_role: AppRole;
};
