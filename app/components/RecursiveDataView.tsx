// app/components/RecursiveDataView.tsx
"use client";

import { useState } from "react";

interface Props {
  data: any;
  label?: string; // The key name (e.g., "volume", "markets")
  level?: number; // Indentation depth
}

export default function RecursiveDataView({ data, label, level = 0 }: Props) {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand top 2 levels only

  // 1. Handle Null/Undefined
  if (data === null || data === undefined) {
    return (
      <div className="font-mono text-xs py-1">
        {label && <span className="text-slate-500 mr-2">{label}:</span>}
        <span className="text-slate-600 italic">null</span>
      </div>
    );
  }

  // 2. Handle Arrays & Objects (Recursive Step)
  if (typeof data === "object") {
    const isArray = Array.isArray(data);
    const keys = Object.keys(data);
    const isEmpty = keys.length === 0;
    const typeLabel = isArray ? `Array [${keys.length}]` : "Object";

    return (
      <div className="font-mono text-xs my-1">
        <div 
          onClick={() => !isEmpty && setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 cursor-pointer select-none py-1 px-2 rounded 
            ${isEmpty ? "opacity-50 cursor-default" : "hover:bg-orange-900/20"}
          `}
        >
          {/* Chevron Icon */}
          {!isEmpty && (
            <span className={`text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}>
              ▶
            </span>
          )}
          
          {/* Key Name */}
          {label && <span className="text-orange-400 font-bold">{label}</span>}
          
          {/* Type Hint (e.g. { ... } or [ ... ]) */}
          <span className="text-slate-600">
             {isArray ? "[" : "{"} 
             {!isOpen && !isEmpty && <span className="mx-1">...</span>}
             {isEmpty && " empty "}
             {isArray ? "]" : "}"}
          </span>
        </div>

        {/* Children (Rendered Recursively) */}
        {isOpen && !isEmpty && (
          <div className="pl-4 ml-2 border-l border-orange-900/20">
            {keys.map((key) => (
              <RecursiveDataView 
                key={key} 
                label={isArray ? undefined : key} // Don't show index labels (0, 1, 2) for arrays
                data={data[key as keyof typeof data]} 
                level={level + 1} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Handle Primitives (Strings, Numbers, Booleans)
  let valueDisplay = <span className="text-slate-300">{String(data)}</span>;

  // Formatting specific types for readability
  if (typeof data === "boolean") {
    valueDisplay = <span className={data ? "text-lime-400" : "text-rose-400"}>{String(data)}</span>;
  } else if (typeof data === "number") {
    valueDisplay = <span className="text-orange-300">{data}</span>;
  } else if (typeof data === "string") {
    // Detect Images
    if (data.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)$/i)) {
       valueDisplay = (
         <div className="mt-1">
            <a href={data} target="_blank" className="text-sky-400 underline break-all hover:text-sky-300">{data}</a>
            <img src={data} alt="preview" className="mt-1 h-16 w-16 object-cover rounded bg-orange-900/20" />
         </div>
       );
    } 
    // Detect Date Strings (ISO format)
    else if (data.match(/^\d{4}-\d{2}-\d{2}T/)) {
        valueDisplay = <span className="text-purple-300">{data}</span>;
    }
    // Long Text (Description)
    else if (data.length > 50) {
        valueDisplay = <span className="text-emerald-100/80 whitespace-pre-wrap block mt-1 p-2 bg-zinc-900 rounded border border-orange-900/20">{data}</span>;
    } 
    else {
        valueDisplay = <span className="text-emerald-300">"{data}"</span>;
    }
  }

  return (
    <div className="font-mono text-xs py-1 hover:bg-zinc-900/50 px-2 rounded">
      {label && <span className="text-slate-500 mr-2">{label}:</span>}
      {valueDisplay}
    </div>
  );
}