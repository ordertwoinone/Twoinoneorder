import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  /* The admin API answers with customer names, phone numbers and email
     addresses, and edits rows — it needs the same session the screens do.
     A JSON 401 rather than the redirect, since these are fetch() callers. */
  if (pathname.startsWith("/api/admin") && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (pathname.startsWith("/admin") && !isLoginPage && !user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isLoginPage && user) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"] };
