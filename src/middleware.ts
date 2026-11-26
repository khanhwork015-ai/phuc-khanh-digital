import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  if ((host.startsWith("admin.") || host.startsWith("duyet.")) && pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const isProtected = pathname.startsWith("/dashboard") || pathname.startsWith("/portal");
  if (isProtected && !hasSessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/portal/:path*"],
};
