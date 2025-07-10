import * as React from "react";

export function Avatar({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-bold select-none " +
        className
      }
      style={{ width: 40, height: 40 }}
    >
      {children}
    </span>
  );
}

export function AvatarFallback({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={
        "flex items-center justify-center w-full h-full rounded-full " +
        className
      }
    >
      {children}
    </span>
  );
} 