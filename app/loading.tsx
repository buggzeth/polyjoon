// app/loading.tsx
import CrabSpinner from "./components/CrabSpinner";

export default function Loading() {
  return (
    // Changed min-h-[60vh] to min-h-screen to cover the full page height
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <CrabSpinner text="SCUTTLING ACROSS CHAIN..." size="lg" />
    </div>
  );
}