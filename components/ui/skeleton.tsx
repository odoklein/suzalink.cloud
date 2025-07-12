import React from "react";
import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("bg-black/20 animate-skeleton rounded-xl", className)} />
  );
} 