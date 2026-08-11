import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Where Google sign-in and e-mail confirmation links land.
 *
 * Two shapes arrive here:
 *
 *   ?code=…        PKCE. Only works in the browser that started the sign-in,
 *                  because the matching verifier lives in that browser's
 *                  cookies. A confirmation e-mail opened on a phone when the
 *                  sign-up happened on a laptop fails here — by design.
 *   ?token_hash=…  The e-mail template's token, verified server-side. No
 *                  verifier needed, so it works on any device. Prefer it for
 *                  confirmation mails (see supabase/README notes).
 *
 * A failure used to redirect exactly like a success, which is why a dead
 * confirmation link looked like "nothing happened". Now the reason travels
 * with the redirect and the account screen says something.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/account";

  // Supabase itself refused the link — an expired or already-used token.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(`${origin}${withFlag(next, "authError", "link")}`);
  }

  const supabase = createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return NextResponse.redirect(`${origin}${withFlag(next, "authError", "link")}`);
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    /* The address is confirmed either way — the exchange is only about handing
       this browser a session. Say so, and ask them to sign in here. */
    if (error) return NextResponse.redirect(`${origin}${withFlag(next, "confirmed", "1")}`);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

function withFlag(next: string, key: string, value: string): string {
  const separator = next.includes("?") ? "&" : "?";
  return `${next}${separator}${key}=${value}`;
}
