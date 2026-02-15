// app/profile/page.tsx
import ProfileView from "../components/ProfileView";
import { auth } from "@/auth"; // Import auth

export const metadata = {
  title: "My Portfolio | PolyAI Trader",
};

export default async function ProfilePage() {
  const session = await auth(); // Fetch user session on server

  return (
    <main className="min-h-screen bg-zinc-950 text-orange-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl font-black bg-gradient-to-r from-orange-400 to-lime-400 bg-clip-text text-transparent">
          Trader Profile
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Track your performance and open positions.
        </p>
      </div>
      
      {/* Pass session user to client component */}
      <ProfileView user={session?.user} />
    </main>
  );
}