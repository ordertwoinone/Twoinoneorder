import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { canAccess, landingPath } from "@/lib/admin-areas";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin";
  const isApi = pathname.startsWith("/api/admin");

  const deny = (status: number, message: string, redirectTo: string) =>
    isApi
      ? NextResponse.json({ error: message }, { status })
      : NextResponse.redirect(new URL(redirectTo, request.url));

  /* Signed out. The API answers JSON because its callers are fetch(); the
     screens go back to the login form. */
  if (!user) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isLoginPage) return NextResponse.redirect(new URL("/admin", request.url));
    return response;
  }

  /**
   * Signed in is not the same as being staff. Customers sign in with Google on
   * the same project, so the admin panel is gated on membership of
   * admin_users — read here with the visitor's own session, which RLS limits
   * to their single row.
   */
  const { data: membership } = await supabase
    .from("admin_users")
    .select("areas, is_owner, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  const member = membership as { areas: string[] | null; is_owner: boolean; is_active: boolean } | null;

  if (!member || !member.is_active) {
    // The no-access page explains it and offers a way out; without this guard
    // it would redirect to itself forever.
    if (pathname === "/admin/no-access") return response;
    return deny(403, "You do not have access to the admin panel.", "/admin/no-access");
  }

  const access = { isOwner: member.is_owner, areas: member.areas ?? [] };

  // A member landing on the login page goes to whatever they can actually open.
  if (isLoginPage) {
    return NextResponse.redirect(new URL(landingPath(access), request.url));
  }

  if (!canAccess(pathname, access)) {
    return deny(403, "You do not have access to this section.", landingPath(access));
  }

  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"] };
