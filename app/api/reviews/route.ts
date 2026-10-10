import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/reviews
 *
 * Submits a patient review and star rating.
 *
 * Security hardening:
 * - Requires authenticated user session
 * - Calls hardened client_submit_patient_review RPC or performs auth-scoped update
 * - Avoids unauthenticated service_role mutation bypass
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Enforce authenticated session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, rating, remark, tags, patientName } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const numRating = Number(rating) || 5;
    const cleanRemark = typeof remark === "string" ? remark.trim() : "";
    const cleanTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
    const nowIso = new Date().toISOString();

    // 2. Execute via secure RPC (with ownership check)
    const { data: rpcRes, error: rpcErr } = await supabase.rpc(
      "client_submit_patient_review",
      {
        p_request_id: requestId,
        p_rating: numRating,
        p_remark: cleanRemark,
        p_tags: cleanTags,
      }
    );

    if (rpcErr) {
      console.error("client_submit_patient_review error:", rpcErr.message);
      return NextResponse.json(
        { error: rpcErr.message || "Failed to submit review" },
        { status: 403 }
      );
    }

    // 3. Broadcast to realtime sync channel so Ops Dashboard updates live
    try {
      const channel = supabase.channel("ops-request-board-sync");
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "patient_review_submitted",
        payload: {
          requestId,
          rating: numRating,
          remark: cleanRemark,
          tags: cleanTags,
          patientName: patientName || "Patient",
          submittedAt: nowIso,
        },
      });
    } catch (e) {
      console.warn("Realtime broadcast notice:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Patient review and remark saved successfully",
      requestId,
      rating: numRating,
      remark: cleanRemark,
      tags: cleanTags,
      data: rpcRes,
    });
  } catch (err: unknown) {
    console.error("Error in /api/reviews POST:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews
 *
 * Returns recent patient reviews for staff desks (admin / dispatcher).
 * Enforces authentication and authorization checks.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Enforce authenticated session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Enforce staff desk role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile || !["admin", "dispatcher"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden: Staff desk access only" }, { status: 403 });
    }

    // 3. Query emergency requests using caller's authenticated session
    const { data: requests, error } = await supabase
      .from("emergency_requests")
      .select(
        "id, emergency_type, status, created_at, patient_address, notes, contact_phone, hospital:hospitals(name), driver:drivers(display_name, vehicle_label)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reviews = [];
    for (const r of requests || []) {
      const notes = r.notes || "";
      const match = notes.match(
        /\[PATIENT (?:REVIEW|FEEDBACK|RATING)[^:]*:\s*([1-5])(?:\/5)?(?:★|\s*stars?)?[^\]]*\]/i
      );
      if (match) {
        const starNum = parseInt(match[1], 10) || 5;
        let remark = "";
        const remarkMatch =
          notes.match(/\[PATIENT REVIEW [^:]+:\s*([^|\]]+)/i) ||
          notes.match(/(?:REMARK|Note):\s*([^|\]]+)/i);
        if (remarkMatch) {
          remark = remarkMatch[1].trim();
        }

        const tags: string[] = [];
        const tagsMatch = notes.match(/(?:Tags|TAGS):\s*([^|\]]+)/i);
        if (tagsMatch) {
          tagsMatch[1].split(",").forEach((t: string) => {
            const tr = t.trim();
            if (tr && tr !== "None") tags.push(tr);
          });
        }

        reviews.push({
          requestId: r.id,
          emergencyType: r.emergency_type,
          status: r.status,
          createdAt: r.created_at,
          patientAddress: r.patient_address,
          contactPhone: r.contact_phone,
          hospitalName: (r.hospital as { name?: string } | null)?.name || "Emergency ER",
          driverName: (r.driver as { display_name?: string } | null)?.display_name || "Solace Unit",
          vehicleLabel: (r.driver as { vehicle_label?: string } | null)?.vehicle_label,
          rating: starNum,
          remark: remark || "Service completed",
          tags,
          fullNotes: notes,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
