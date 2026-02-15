// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { SupabaseAdapter } from "@auth/supabase-adapter"

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: false, // Enable debugging to see exactly where it fails
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // CRITICAL FIX: Must use the Service Role Key here
    secret: process.env.SUPABASE_SECRET_KEY!, 
  }),
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})