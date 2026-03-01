import type { ReactNode } from "react";

export default function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card-premium ${className}`.trim()}>{children}</section>;
}
