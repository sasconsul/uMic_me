import type { ReactNode } from "react";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return text.toLowerCase().includes(q.toLowerCase());
}

export function highlightMatches(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const regex = new RegExp(`(${escapeRegExp(q)})`, "gi");
  const parts = text.split(regex);
  const lowerQ = q.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase() === lowerQ ? (
      <mark key={i} className="bg-yellow-300/70 text-foreground rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
