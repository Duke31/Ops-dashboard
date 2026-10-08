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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, rating, remark, tags, patientName } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const numRating = Number(rating) || 5;
    const cleanRemark = typeof remark === "string" ? remark.trim() : "";
    const cleanTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
    const nowIso = new Date().toISOString();
    const dateFormatted = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const supabase = await getDbClient();

    // 1. Fetch existing notes
    const { data: existing, error: fetchErr } = await supabase
      .from("emergency_requests")
      .select("notes, status, emergency_type")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr) {
      console.warn("Could not fetch existing request notes:", fetchErr.message);
    }

    const currentNotes = existing?.notes || "";
    // Remove any previous [PATIENT REVIEW ...] block to allow updating cleanly
    const sanitizedNotes = currentNotes
      .replace(/\[PATIENT (?:REVIEW|FEEDBACK|RATING)[^\]]*\]/gi, "")
      .trim();

    const reviewBlock = `[PATIENT REVIEW ${"★".repeat(numRating)}${"☆".repeat(5 - numRating)} (${numRating}/5)]: ${cleanRemark || "Service completed"} | TAGS: ${cleanTags.join(", ") || "None"} | SUBMITTED: ${dateFormatted}]`;
    const updatedNotes = sanitizedNotes
      ? `${sanitizedNotes}\n${reviewBlock}`
      : reviewBlock;

    // 2. Update emergency_requests with the review
    const { error: updateErr } = await supabase
      .from("emergency_requests")
      .update({ notes: updatedNotes })
      .eq("id", requestId);

    if (updateErr) {
      console.error("Failed to update emergency_requests notes with review:", updateErr);
      return NextResponse.json(
        { error: updateErr.message || "Failed to update review" },
        { status: 500 }
      );
    }

    // 3. Broadcast to realtime sync channel so Ops Dashboard updates live!
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
      notes: updatedNotes,
    });
  } catch (err: unknown) {
    console.error("Error in /api/reviews:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await getDbClient();
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
