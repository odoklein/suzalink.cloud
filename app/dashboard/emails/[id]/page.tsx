'use client';
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function EmailDetailsPage() {
  // Mock data for demonstration
  const email = {
    from: {
      name: "Contact For “Website Design”",
      email: "codescandy hello@example.com",
      avatar: "https://ui-avatars.com/api/?name=Website+Design",
    },
    subject: "Contact For “Website Design”",
    date: "2024-06-01T10:00:00Z",
    body: `Hello Dear Alexander,\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ut rutrum mi. Aenean ac leo non justo suscipit consectetur. Nam vestibulum eleifend magna quis porta.\n\nPraesent ut rutrum mi. Aenean ac leo non justo suscipit consectetur. Nam vestibulum eleifend magna quis porta.\n\nNullam tincidunt sodales diam, quis rhoncus dolor aliquet a. Nulla a rhoncus lectus. In nunc neque, pellentesque non massa ornare, accumsan ornare massa.\n\nSuspendisse semper vel turpis vitae aliquam. Aenean semper dui in consequat ullamcorper.\n\nNullam tincidunt sodales diam, quis rhoncus dolor aliquet a. Nulla a rhoncus lectus. In nunc neque, pellentesque non massa ornare, accumsan ornare massa.\n\nPraesent ut rutrum mi. Aenean ac leo non justo suscipit consectetur. Nam vestibulum eleifend magna quis porta.`,
    attachments: [
      { name: "Guidelines.pdf", type: "PDF", url: "#" },
      { name: "Branding Assets", type: "Media", url: "#" },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Inbox Details</h1>
          <nav className="text-sm text-gray-500">
            Home <span className="mx-1">/</span> <Link href="/dashboard/emails" className="hover:underline">Inbox</Link> <span className="mx-1">/</span> <span className="text-gray-800 font-semibold">Inbox Details</span>
          </nav>
        </div>
        <div className="flex gap-6">
          {/* Sidebar placeholder for spacing */}
          <div className="w-80" />
          {/* Details Panel */}
          <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <button className="p-2 hover:bg-gray-100 rounded" title="Back">←</button>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded" title="Delete">🗑️</button>
                <button className="p-2 hover:bg-gray-100 rounded" title="Archive">📦</button>
                <button className="p-2 hover:bg-gray-100 rounded" title="Mark as unread">✉️</button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>4 of 120</span>
                <button className="p-1 rounded hover:bg-gray-100">&#60;</button>
                <button className="p-1 rounded hover:bg-gray-100">&#62;</button>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <img src={email.from.avatar} alt="avatar" className="w-12 h-12 rounded-full" />
              <div>
                <div className="font-semibold text-gray-800">{email.from.name}</div>
                <div className="text-xs text-gray-500">{email.from.email}</div>
              </div>
            </div>
            <div className="mb-6 whitespace-pre-line text-gray-700">
              {email.body}
            </div>
            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-2">{email.attachments.length} Attachments</div>
              <div className="flex gap-4">
                {email.attachments.map((att, idx) => (
                  <a key={idx} href={att.url} className="flex items-center gap-2 border rounded-lg px-4 py-2 bg-gray-50 hover:bg-gray-100 transition">
                    <span className="text-lg">{att.type === "PDF" ? "📄" : "🖼️"}</span>
                    <span className="font-medium text-gray-700">{att.name}</span>
                    <span className="text-xs text-blue-600 underline">Download</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="flex gap-2 border-t pt-4">
              <button className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Reply</button>
              <button className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Reply all</button>
              <button className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Forward</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
