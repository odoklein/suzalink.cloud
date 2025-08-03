"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔐 Login attempt started for:", email);
    setLoading(true);
    setError(null);
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      
      console.log("📡 Sign in response:", result);
      
      if (result?.error) {
        console.error("❌ Login error:", result.error);
        
        // Provide user-friendly error messages
        let errorMessage = "Échec de la connexion";
        if (result.error === "CredentialsSignin") {
          errorMessage = "Email ou mot de passe incorrect";
        } else if (result.error.includes("Invalid login credentials")) {
          errorMessage = "Email ou mot de passe incorrect";
        } else if (result.error.includes("Email not confirmed")) {
          errorMessage = "Veuillez confirmer votre email avant de vous connecter";
        } else if (result.error.includes("Too many requests")) {
          errorMessage = "Trop de tentatives. Veuillez réessayer plus tard";
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } else if (result?.ok) {
        console.log("✅ Login successful for user:", email);
        toast.success("Connexion réussie!");
        
        // Add a small delay to ensure session is properly set
        setTimeout(() => {
          console.log("🚀 Redirecting to dashboard...");
          router.push("/dashboard");
        }, 500);
      } else {
        console.error("❌ Unexpected login result:", result);
        setError("Une erreur inattendue s'est produite");
        toast.error("Échec de la connexion");
      }
    } catch (err) {
      console.error("💥 Unexpected error:", err);
      setError("Une erreur inattendue s'est produite");
      toast.error("Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col justify-center bg-gradient-to-br from-background/50 to-muted/50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <img src="/logopng.svg" alt="Logo Suzalink" className="h-12 w-auto" />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border-2 border-gray-200 px-6 py-8 rounded-2xl shadow-xl shadow-primary/5 backdrop-blur-sm">
          {error && (
            <div className="mb-4 text-sm text-destructive">
              {error}
            </div>
          )}
          
          <form className="space-y-6" method="post" onSubmit={handleLogin} noValidate>
            <div>
              <Label htmlFor="email" className="block text-sm font-medium">
                Adresse e-mail
              </Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium">
                Mot de passe
              </Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-input px-3 py-2 placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="remember-me"
                name="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-foreground"
              >
                Se souvenir de moi
              </Label>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}