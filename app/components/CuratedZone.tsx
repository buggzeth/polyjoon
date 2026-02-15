// app/components/CuratedZone.tsx
import { getTrendingCategories } from "../actions/getTrendingCategories";
import CuratedList from "./CuratedList";

export default async function CuratedZone() {
  const categories = await getTrendingCategories();

  if (categories.length === 0) return null;

  return (
    <div className="space-y-2 mb-12">
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="h-2 w-2 bg-orange-500 animate-pulse rounded-full" />
        <h2 className="text-sm font-mono text-orange-500/80 uppercase tracking-widest">
            High Voltage Sectors
        </h2>
      </div>

      <CuratedList categories={categories} />
    </div>
  );
}