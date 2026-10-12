import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://aogknxtyvzpzqkgmgtsv.supabase.co";
  const target = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/app-releases/solace-v1.0.apk`;
  return NextResponse.redirect(target, { status: 307 });
}
