"use client";
import { useParams } from "next/navigation";

export default function AgendaPage() {
  const { id } = useParams();
  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
      <h1 className="text-3xl font-bold mb-6">Agenda</h1>
      <div className="text-gray-500 text-xl">Agenda functionality coming soon...</div>
    </div>
  );
} 