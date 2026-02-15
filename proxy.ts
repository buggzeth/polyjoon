// proxy.ts
import { auth } from "@/auth"

// Auth.js v5's 'auth' function signature is compatible with the Next.js Proxy signature
export const proxy = auth;

export const config = {
  // Matcher excludes static assets to prevent running on every image load
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}