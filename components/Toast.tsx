"use client";

import { useEffect } from "react";

export function Toast({
  message,
  kind = "error",
  onClose,
}: {
  message: string | null;
  kind?: "error" | "ok";
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className={`toast ${kind === "error" ? "toast-error" : "toast-ok"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="leading-5">{message}</p>
        <button className="text-xs font-semibold opacity-70" onClick={onClose}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
