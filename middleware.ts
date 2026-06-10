import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("admin_session")?.value;
  const validToken = process.env.ADMIN_SESSION_TOKEN;

  const isLoginPage = pathname === "/admin";
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute && !isLoginPage) {
    if (session !== validToken) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (isLoginPage && session === validToken) {
    return NextResponse.redirect(new URL("/admin/restaurants", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
