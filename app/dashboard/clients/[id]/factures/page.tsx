"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Facture {
  id: string;
  invoice_number: string;
  date: string;
  total: number;
}

export default function FacturesPage() {
  const { id } = useParams();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [facturesLoading, setFacturesLoading] = useState(true);
  const [facturesError, setFacturesError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFactures() {
      setFacturesLoading(true);
      setFacturesError(null);
      try {
        const res = await fetch(`/api/factures?client_id=${id}`);
        if (!res.ok) throw new Error("Failed to fetch factures");
        const data = await res.json();
        setFactures(data);
      } catch (e: any) {
        setFacturesError(e.message);
      } finally {
        setFacturesLoading(false);
      }
    }
    if (id) fetchFactures();
  }, [id]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Factures</h1>
      {facturesLoading ? (
        <div>Loading factures...</div>
      ) : facturesError ? (
        <div className="text-red-500">{facturesError}</div>
      ) : factures.length === 0 ? (
        <div>No factures found for this client.</div>
      ) : (
        <table className="min-w-full text-sm bg-white rounded-xl overflow-hidden">
          <thead>
            <tr>
              <th className="text-left p-2">Invoice #</th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {factures.map(f => (
              <tr key={f.id}>
                <td className="p-2">{f.invoice_number}</td>
                <td className="p-2">{f.date?.slice(0, 10)}</td>
                <td className="p-2">{f.total?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 