import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/hospitals
 *
 * Returns the hospitals directory.
 * Requires authenticated session — hospital data is used by staff desks only.
 *
 * Security note: Removed the service_role fallback getDbClient() pattern.
 * The session client is sufficient here — hospitals table now has
 * "hospitals_authenticated_read" policy (authenticated only, no anon).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Require authenticated session
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const { data: hospital, error } = await supabase
        .from("hospitals")
        .select("id, name, address, lat, lng, intake_phone, available_capacity")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!hospital) {
        return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
      }

      return NextResponse.json(hospital);
    }

    const { data: hospitals, error } = await supabase
      .from("hospitals")
      .select("id, name, address, lat, lng, intake_phone, available_capacity")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ hospitals: hospitals || [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
