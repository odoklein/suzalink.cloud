'use client'
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function InboxPage() {
  const { session, loading: authLoading } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchEmails = async () => {
      if (!session) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/emails/inbox", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to fetch emails");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setEmails(data.emails || []);
      } catch (e) {
        setError("Failed to fetch emails");
      }
      setLoading(false);
    };
    if (!authLoading) fetchEmails();
  }, [session, authLoading]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inbox</h1>
        <nav className="text-sm text-gray-500">
          Home <span className="mx-1">/</span> <span className="text-gray-800 font-semibold">Inbox</span>
        </nav>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" className="w-4 h-4" />
          <button className="p-2 hover:bg-gray-100 rounded"><span>⟳</span></button>
          <button className="p-2 hover:bg-gray-100 rounded"><span>🗑️</span></button>
          <button className="p-2 hover:bg-gray-100 rounded"><span>📥</span></button>
          <button className="p-2 hover:bg-gray-100 rounded"><span>...</span></button>
          <input type="text" placeholder="Search..." className="ml-auto border rounded px-3 py-1 w-64" />
        </div>
        {/* Email List */}
        <div className="overflow-x-auto min-h-[200px]">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading emails...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : emails.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No emails found.</div>
          ) : (
            <table className="min-w-full text-sm">
              <tbody>
                {emails.map(email => (
                  <tr
                    key={email.uid}
                    className="hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => router.push(`/dashboard/emails/${email.uid}`)}
                  >
                    <td className="px-2 py-3"><input type="checkbox" /></td>
                    <td className="px-2 py-3 font-semibold text-gray-800">{email.from}</td>
                    <td className="px-2 py-3 text-gray-600">{email.subject}</td>
                    <td className="px-2 py-3 text-gray-400 text-xs text-right">{new Date(email.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Showing 1 of 159</span>
          <div className="flex gap-2">
            <button className="p-1 rounded hover:bg-gray-100">&#60;</button>
            <button className="p-1 rounded hover:bg-gray-100">&#62;</button>
          </div>
        </div>
      </div>
    </>
  );
} 