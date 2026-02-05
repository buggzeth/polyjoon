// app/loading.tsx
import CrabSpinner from "./components/CrabSpinner";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-zinc-950">
      <CrabSpinner text="SCUTTLING ACROSS CHAIN..." size="lg" />
    </div>
  );
}