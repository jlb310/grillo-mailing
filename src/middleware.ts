import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || ""

  // mailing.grillo.click → correo.grillo.click (301 permanente)
  if (host.startsWith("mailing.grillo.click")) {
    const url = request.nextUrl.clone()
    url.hostname = "correo.grillo.click"
    return NextResponse.redirect(url, 301)
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image.png|twitter-image.png).*)",
}
