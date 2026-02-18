// proxy.ts
export const runtime = 'edge';

import { auth } from "@/auth"

export const middleware = auth;

export const config = {
  // Regex explainer:
  // 1. Negate (do not match) if path starts with api/
  // 2. Negate if path starts with _next/static/ or _next/image/
  // 3. Negate if path is favicon.ico
  // 4. Negate if path ends with common image extensions
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ],
}