import { NextRequest, NextResponse } from "next/server";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/env";
import { createClient as createServerClient } from "@/lib/supabase/server";

async function getDbClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createJsClient(getSupabaseUrl(), serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return await createServerClient();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const supabase = await getDbClient();

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
      { status: 500 },
    );
  }
}
