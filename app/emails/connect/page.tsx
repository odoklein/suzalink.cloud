"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConnectEmailPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    imap_host: "",
    imap_port: "",
    smtp_host: "",
    smtp_port: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Insert email account
      const { error: insertError } = await supabase
        .from('email_accounts')
        .insert({
          user_id: user.id,
          email: formData.email,
          password: formData.password,
          imap_host: formData.imap_host,
          imap_port: parseInt(formData.imap_port),
          smtp_host: formData.smtp_host,
          smtp_port: parseInt(formData.smtp_port)
        });

      if (insertError) {
        throw insertError;
      }

      // Redirect to inbox
      router.push("/emails/inbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Email Account</CardTitle>
          <CardDescription>
            Add your email account to start managing emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Your email password"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imap_host">IMAP Host</Label>
                <Input
                  id="imap_host"
                  name="imap_host"
                  type="text"
                  value={formData.imap_host}
                  onChange={handleInputChange}
                  required
                  placeholder="imap.gmail.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imap_port">IMAP Port</Label>
                <Input
                  id="imap_port"
                  name="imap_port"
                  type="number"
                  value={formData.imap_port}
                  onChange={handleInputChange}
                  required
                  placeholder="993"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_host">SMTP Host</Label>
                <Input
                  id="smtp_host"
                  name="smtp_host"
                  type="text"
                  value={formData.smtp_host}
                  onChange={handleInputChange}
                  required
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  name="smtp_port"
                  type="number"
                  value={formData.smtp_port}
                  onChange={handleInputChange}
                  required
                  placeholder="587"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Connecting..." : "Connect Email Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 