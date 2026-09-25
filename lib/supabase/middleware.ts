import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, homeForRole } from "@/lib/roles";
import type { AppRole, Profile } from "@/lib/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/login";
  const isRest =
    pathname === "/no-access" ||
    pathname === "/reset" ||
    pathname === "/driver";
  const isPublic = isLogin || isRest || pathname.startsWith("/auth");

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, role, hospital_id, display_name")
      .eq("user_id", user.id)
      .maybeSingle<Profile>();

    const role = profile?.role as AppRole | undefined;

    if (isLogin) {
      const dest = request.nextUrl.clone();
      dest.pathname = role ? homeForRole(role) : "/no-access";
      dest.search = "";
      if (role) return NextResponse.redirect(dest);
    }

    if (role && !canAccessPath(role, pathname)) {
      const dest = request.nextUrl.clone();
      dest.pathname = homeForRole(role);
      dest.search = "";
      return NextResponse.redirect(dest);
    }

    if (user && !role && !isPublic) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/login";
      dest.searchParams.set("error", "no-role");
      return NextResponse.redirect(dest);
    }
  }

  return supabaseResponse;
}
