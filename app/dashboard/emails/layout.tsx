import React from "react";

export default function EmailsLayout({ children }: { children: React.ReactNode }) {
  // Sidebar code from inbox page
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white rounded-xl m-4 p-4 flex flex-col shadow-sm">
        <button className="mb-6 py-2 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Compose</button>
        <div className="mb-6">
          <div className="text-xs font-bold text-gray-500 mb-2">MAILBOX</div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-blue-600 font-semibold bg-blue-50 rounded px-2 py-1">📥 Inbox <span className="ml-auto text-xs bg-blue-100 px-2 rounded">0</span></li>
            <li className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 rounded px-2 py-1 cursor-pointer">✉️ Sent</li>
            <li className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 rounded px-2 py-1 cursor-pointer">🗑️ Spam</li>
          </ul>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 m-4">{children}</main>
    </div>
  );
} 