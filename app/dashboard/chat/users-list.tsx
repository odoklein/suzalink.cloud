"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export default function UsersList({ onSelectUser }: { onSelectUser?: (user: User) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      let query = supabase.from("users").select("id, email, full_name, role");
      if (search.trim()) {
        query = query.ilike("full_name", `%${search}%`);
      }
      const { data, error } = await query;
      if (!error) setUsers(data || []);
      setLoading(false);
    };
    fetchUsers();
  }, [search]);

  return (
    <aside className="w-80 min-w-[280px] bg-white border-r border-gray-100 flex flex-col p-6 rounded-3xl m-4 ml-0 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">Utilisateurs CRM</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="text-center text-gray-400 mt-8">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">Aucun utilisateur</div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer mb-2 transition-all hover:bg-blue-50"
              onClick={() => onSelectUser && onSelectUser(user)}
            >
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-lg">
                {user.full_name ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2) : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-base truncate">{user.full_name || user.email}</span>
                <span className="block text-xs text-gray-400">{user.email}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
