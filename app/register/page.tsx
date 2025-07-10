"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createUserProfile } from "@/lib/supabase-examples";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      console.log("Attempting to register with email:", email);
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) {
        console.error("Registration error:", error);
        throw error;
      }
      
      console.log("Registration successful:", data);
      
      if (data.user) {
        // Create user profile
        try {
          await createUserProfile(data.user.id, email);
          console.log("User profile created successfully");
        } catch (profileError) {
          console.error("Profile creation error:", profileError);
          // Don't throw here, user is still registered
        }
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Full error details:", err);
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleRegister} className="w-full max-w-sm space-y-6 bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Enter your email address"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            minLength={6}
          />
        </div>
        {error && (
          <div className="text-red-500 text-sm p-3 bg-red-50 rounded border">
            {error}
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded font-semibold hover:bg-gray-800 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>
        <div className="text-sm text-center">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login</a>
        </div>
      </form>
    </div>
  );
} 