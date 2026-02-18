// app/api/auth/[...nextauth]/route.ts
export const runtime = 'edge';

import { handlers } from "@/auth"
export const { GET, POST } = handlers