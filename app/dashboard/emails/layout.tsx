'use client';
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EmailsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white rounded-xl m-4 p-4 flex flex-col shadow-sm">
        <div className="mb-6">
          <div className="text-xs font-bold text-gray-500 mb-2">MAILBOX</div>
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard/emails" legacyBehavior>
                <a className={`flex items-center gap-2 ${pathname === "/dashboard/emails" ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-700 hover:bg-gray-100"} rounded px-2 py-1`}>
                  📥 Inbox <span className="ml-auto text-xs bg-blue-100 px-2 rounded">0</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/emails/sent" legacyBehavior>
                <a className={`flex items-center gap-2 ${pathname === "/dashboard/emails/sent" ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-700 hover:bg-gray-100"} rounded px-2 py-1`}>
                  ✉️ Sent
                </a>
              </Link>
            </li>
            <li className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 rounded px-2 py-1 cursor-pointer">🗑️ Spam</li>
          </ul>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 m-4">{children}</main>
    </div>
  );
}