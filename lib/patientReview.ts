export interface PatientReview {
  rating: number; // 1 to 5
  remark: string; // The patient's written feedback
  tags: string[]; // e.g. ['Fast Arrival', 'Expert Paramedics']
  submittedAt?: string;
}

export function parsePatientReview(notes: string | null | undefined): PatientReview | null {
  if (!notes) return null;

  // Extract rating (1 to 5) through multiple robust patterns
  let rating: number | null = null;

  // 1. (X/5) pattern e.g. "(5/5)" or "5/5"
  const ratioMatch = notes.match(/\(([1-5])\/5\)/) || notes.match(/([1-5])\/5/);
  if (ratioMatch) {
    rating = parseInt(ratioMatch[1], 10);
  }

  // 2. Explicit star number pattern e.g. "5★", "5 stars"
  if (!rating) {
    const starNumMatch = notes.match(/([1-5])\s*(?:★|⭐|stars?)/i);
    if (starNumMatch) {
      rating = parseInt(starNumMatch[1], 10);
    }
  }

  // 3. Count literal star symbols inside [PATIENT REVIEW ...]
  if (!rating) {
    const blockMatch = notes.match(/\[PATIENT\s+(?:REVIEW|FEEDBACK|RATING)[^\]]*\]/i);
    if (blockMatch) {
      const starsCount = (blockMatch[0].match(/[★⭐]/g) || []).length;
      if (starsCount >= 1 && starsCount <= 5) {
        rating = starsCount;
      }
    }
  }

  // 4. Pattern: PATIENT REVIEW ... : 5
  if (!rating) {
    const directMatch = notes.match(/PATIENT\s+(?:REVIEW|FEEDBACK|RATING)[^:]*:\s*([1-5])/i);
    if (directMatch) {
      rating = parseInt(directMatch[1], 10);
    }
  }

  if (!rating || rating < 1 || rating > 5) return null;

  // Extract Remark:
  let remark = "";
  const namedRemark = notes.match(/(?:REMARK|Note):\s*([^|\]\n\r]+)/i);
  if (namedRemark) {
    remark = namedRemark[1].trim();
  } else {
    const reviewBlockMatch = notes.match(/\[PATIENT\s+(?:REVIEW|FEEDBACK|RATING)[^:]*:\s*([^|\]]+)/i);
    if (reviewBlockMatch) {
      remark = reviewBlockMatch[1].trim();
    }
  }

  // Extract Tags:
  const tags: string[] = [];
  const tagsMatch = notes.match(/(?:TAGS|Tags):\s*([^|\]\n\r]+)/i);
  if (tagsMatch) {
    tagsMatch[1].split(",").forEach((t) => {
      const trimmed = t.trim();
      if (trimmed && trimmed.toLowerCase() !== "none") {
        tags.push(trimmed);
      }
    });
  }

  // Extract Submitted At:
  let submittedAt: string | undefined;
  const dateMatch = notes.match(/(?:SUBMITTED|AT):\s*([^\]]+)/i);
  if (dateMatch) {
    submittedAt = dateMatch[1].trim();
  }

  return {
    rating,
    remark: remark || "Emergency service completed.",
    tags,
    submittedAt,
  };
}

export function getCleanMedicalNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .replace(/\[PATIENT\s+(?:REVIEW|FEEDBACK|RATING)[^\]]*\]/gi, "")
    .replace(/\[TACTICAL\s+(?:RADIO|ALERT)[^\]]*\]:[^\n\r]*/gi, "")
    .replace(/\[DISPATCH\s+(?:ACK|RADIO)[^\]]*\]:[^\n\r]*/gi, "")
    .trim();
}
