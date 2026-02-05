// app/components/CrabSpinner.tsx
"use client";

interface CrabSpinnerProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export default function CrabSpinner({ text, size = "md" }: CrabSpinnerProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4">
      <div className="flex gap-2">
        <span className={`animate-bounce ${sizeClasses[size]}`} style={{ animationDelay: "0ms" }}>🦀</span>
        <span className={`animate-bounce ${sizeClasses[size]}`} style={{ animationDelay: "150ms" }}>🦀</span>
        <span className={`animate-bounce ${sizeClasses[size]}`} style={{ animationDelay: "300ms" }}>🦀</span>
      </div>
      {text && (
        <span className="text-orange-400 font-mono text-xs uppercase tracking-widest animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}