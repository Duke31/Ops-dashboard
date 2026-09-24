export type AppRole = "dispatcher" | "hospital" | "admin";

export const APP_ROLES: AppRole[] = ["dispatcher", "hospital", "admin"];

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
  created_at?: string;
};

export type Driver = {
  id: string;
  display_name: string | null;
  vehicle_label: string | null;
  hospital_id: string | null;
  status?: string | null;
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
  completed_at: string | null;
  priority: string | number | null;
  hospital?: Hospital | null;
  driver?: Driver | null;
};

export type TransitionRule = {
  from_status: string;
  to_status: string;
  actor_role: AppRole;
};
