import type { AppRole } from "./types";

export function homeForRole(role: AppRole): string {
  return `/${role}`;
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
