import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const stored = request.cookies.get("jarvis-language")?.value;
  const preferred = stored && ["en","hy","fr","ru"].includes(stored) ? stored : undefined;
  const explicit = url.pathname === "/en" || url.pathname === "/hy" ? url.pathname.slice(1) : undefined;
  const headers = new Headers(request.headers);
  headers.set("x-jarvis-locale", explicit ?? preferred ?? url.searchParams.get("lang") ?? "en");
  if (preferred && !explicit && !url.searchParams.has("lang")) {
    url.searchParams.set("lang", preferred === "hy" ? "hy" : "en");
    return NextResponse.rewrite(url, {request:{headers}});
  }
  return NextResponse.next({request:{headers}});
}

export const config = { matcher: ["/((?!api/|_next/|.*\\..*).*)"] };
