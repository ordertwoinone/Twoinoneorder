import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", process.env.ADMIN_SESSION_TOKEN!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
