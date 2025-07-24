"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import DarkVeil from "@/utils/Backgrounds/DarkVeil/DarkVeil";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10 bg-black">
        <DarkVeil className="w-full h-full" />
      </div>
      <div className="w-full max-w-md mx-auto p-4 relative z-10">
        <Card className="shadow-xl border border-neutral-700 bg-white">
          <CardContent className="p-8">
            {/* Dark mode styles for card content */}
            {/* Branding */}
            <div className="flex flex-row items-center justify-center mb-8 select-none">
                
              <span className="inline-block ">
                <svg width="50" height="50" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="18" r="7.2" fill="#FF6F91" />
                  <rect x="18" y="8" width="9.6" height="19.2" rx="4.8" fill="#6FC3FF" />
                </svg>
              </span>
              <span className="text-gray-900 font-semibold tracking-tight text-3xl" style={{ fontFamily: 'Gellix, sans-serif' }}>Suzalink</span>
            </div>
           
            <form onSubmit={handleLogin} className="space-y-6 text-white font-bold">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-11 bg-black border border-neutral-700 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                  <Link href="#" className="text-white text-sm font-bold underline-offset-2 hover:underline">Forgot password?</Link>
                </div>
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-11 bg-black border border-neutral-700 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-white/20"
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm bg-red-100 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-between mt-2 mb-1">
                <label className="flex items-center text-gray-700 text-sm font-bold">
                  <input type="checkbox" className="form-checkbox mr-2 accent-white bg-black border-neutral-700 rounded" />
                  Rester connecté
                </label>
                <Link href="#" className="text-white text-sm font-bold underline-offset-2 hover:underline">Forgot password?</Link>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-black text-white font-bold rounded-xl mt-4 hover:bg-gray-900 transition"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 