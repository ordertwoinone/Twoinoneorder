"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudentCard } from "@/lib/student-card";

/**
 * The signed-in student's privilege card, or null for everyone else.
 *
 * The route answers `{ card: null }` rather than a 401 for a signed-out
 * visitor, so a cart can ask on every load without caring who is looking.
 */
export function useStudentCard() {
  const [card, setCard] = useState<StudentCard | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/student-card", { cache: "no-store" });
      const data = await res.json();
      setCard((data?.card as StudentCard | null) ?? null);
    } catch {
      setCard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { card, loading, refresh };
}
