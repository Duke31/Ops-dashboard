import type { AppRole } from "./types";

const DESK_ROLES: AppRole[] = ["dispatcher", "hospital", "admin"];

export function isDeskRole(role: string | null | undefined): role is AppRole {
  return !!role && DESK_ROLES.includes(role as AppRole);
}

export function homeForRole(role: string | null | undefined): string {
  if (role === "dispatcher" || role === "hospital" || role === "admin") {
    return `/${role}`;
  }
  if (role === "driver") return "/driver";
  return "/no-access";
}

export function roleFromPath(pathname: string): AppRole | null {
  if (pathname === "/dispatcher" || pathname.startsWith("/dispatcher/")) {
    return "dispatcher";
  }
  if (pathname === "/hospital" || pathname.startsWith("/hospital/")) {
    return "hospital";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }
  return null;
}

export function canAccessPath(role: AppRole, pathname: string): boolean {
  const required = roleFromPath(pathname);
  if (!required) return true;
  if (role === "admin") return true;
  return role === required;
}
