import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/utils/auth-config";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth");

  // Allow static files, images, etc.
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/static") ||
    request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)
  ) {
    return NextResponse.next();
  }

  // If user is trying to access login page or auth api, allow it (but redirect to home if already logged in?)
  if (isLoginPage) {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isApiAuth) {
    return NextResponse.next();
  }

  // Determine if we need to secure this route
  // For now, secure everything else
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
