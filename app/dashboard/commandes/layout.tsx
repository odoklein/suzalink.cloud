import React from "react";

export default function CommandesLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-muted flex flex-col">
      {children}
    </section>
  );
} 