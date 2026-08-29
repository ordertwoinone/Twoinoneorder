export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { STUDENT_DISCOUNT_PERCENT } from "@/lib/student-card";
import { cleanCardCode, findPrivilegeCard } from "@/lib/kiosk/privilege";

/**
 * Looks up a Student Privilege Card from the number typed at the kiosk.
 *
 * There is nobody signed in at a kiosk, so the card is identified by what is
 * printed on it: the short member id read out at the counter ("KU-25896"), or
 * the sixteen-digit number.
 *
 * The rate comes back from the card's own row rather than being trusted from
 * the screen — and the order route looks the card up again when it prices what
 * was sent, so a reply forged here buys nothing.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = cleanCardCode(body?.code);

  if (!code) {
    return NextResponse.json({ valid: false, error: "Enter your card or member number" });
  }

  const card = await findPrivilegeCard(code);

  /* One message for "no such card" and for "expired or withdrawn". A kiosk
     stands in a public room, and telling a stranger which numbers exist makes
     it a card-number oracle. Staff at the counter can say which it was. */
  if (!card) {
    return NextResponse.json({ valid: false, error: "We could not use that card" });
  }

  return NextResponse.json({
    valid: true,
    card: {
      member_id: card.member_id,
      full_name: card.full_name,
      discount_percent: card.discount_percent ?? STUDENT_DISCOUNT_PERCENT,
    },
  });
}
