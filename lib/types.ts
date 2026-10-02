export type AppRole = "dispatcher" | "hospital" | "admin" | "driver";

export const APP_ROLES: AppRole[] = ["dispatcher", "hospital", "admin", "driver"];

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
};

export type TransitionRule = {
  from_status: string;
  to_status: string;
  actor_role: AppRole;
};

