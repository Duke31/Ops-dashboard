export interface PatientReview {
  rating: number; // 1 to 5
  remark: string; // The patient's written feedback
  tags: string[]; // e.g. ['Fast Arrival', 'Expert Paramedics']
  submittedAt?: string;
}

export function parsePatientReview(notes: string | null | undefined): PatientReview | null {
  if (!notes) return null;

  // Match: [PATIENT REVIEW ★★★★★ (5/5)]: remark | TAGS: ... | SUBMITTED: ...
  // or: [PATIENT FEEDBACK: 5★ | Tags: ... | Note: ...]
  const starMatch =
    notes.match(/PATIENT (?:REVIEW|FEEDBACK|RATING)[^:]*:\s*([1-5])(?:\/5)?(?:★|\s*stars?)?/i) ||
    notes.match(/([1-5])★/);

  if (!starMatch) return null;
  const rating = parseInt(starMatch[1], 10);
  if (isNaN(rating) || rating < 1 || rating > 5) return null;

  let remark = "";
  const remarkMatch =
    notes.match(/\[PATIENT REVIEW [^:]+:\s*([^|\]]+)/i) ||
    notes.match(/(?:REMARK|Note):\s*([^|\]\n\r]+)/i);
  if (remarkMatch) {
    remark = remarkMatch[1].trim();
  }

  const tags: string[] = [];
  const tagsMatch = notes.match(/(?:Tags|TAGS):\s*([^|\]\n\r]+)/i);
  if (tagsMatch) {
    tagsMatch[1].split(",").forEach((t) => {
      const trimmed = t.trim();
      if (trimmed && trimmed.toLowerCase() !== "none") {
        tags.push(trimmed);
      }
    });
  }

  let submittedAt: string | undefined;
  const dateMatch = notes.match(/(?:SUBMITTED|AT):\s*([^\]]+)/i);
  if (dateMatch) {
    submittedAt = dateMatch[1].trim();
  }

  return {
    rating,
    remark: remark || "Patient confirmed service completion.",
    tags,
    submittedAt,
  };
}

export function getCleanMedicalNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .replace(/\[PATIENT (?:REVIEW|FEEDBACK|RATING)[^\]]*\]/gi, "")
    .replace(/\[TACTICAL (?:RADIO|ALERT)[^\]]*\]:[^\n\r]*/gi, "")
    .replace(/\[DISPATCH (?:ACK|RADIO)[^\]]*\]:[^\n\r]*/gi, "")
    .trim();
}
