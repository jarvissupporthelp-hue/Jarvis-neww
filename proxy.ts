import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-jarvis-locale", request.nextUrl.pathname === "/en" ? "en" : "hy");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/hy", "/en"] };
