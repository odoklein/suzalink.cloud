"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Paperclip, X } from "lucide-react";
import Link from "next/link";

export default function ComposePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: ""
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Not authenticated");
      }

      // Call the send email API (we'll need to create this)
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.to,
          cc: formData.cc,
          bcc: formData.bcc,
          subject: formData.subject,
          body: formData.body,
          attachments: attachments.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
          }))
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to send email');
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      
      // Redirect to sent folder or show success message
      router.push('/emails/sent');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/emails">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Email
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Send className="h-8 w-8 text-purple-600" />
            Compose Email
          </h1>
          <p className="text-gray-600 mt-1">
            Write and send a new email message
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Message</CardTitle>
          <CardDescription>
            Fill in the details below to compose your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* To Field */}
            <div className="space-y-2">
              <Label htmlFor="to">To *</Label>
              <Input
                id="to"
                name="to"
                type="email"
                value={formData.to}
                onChange={handleInputChange}
                required
                placeholder="recipient@example.com"
                className="w-full"
              />
            </div>

            {/* CC Field */}
            <div className="space-y-2">
              <Label htmlFor="cc">CC</Label>
              <Input
                id="cc"
                name="cc"
                type="email"
                value={formData.cc}
                onChange={handleInputChange}
                placeholder="cc@example.com"
                className="w-full"
              />
            </div>

            {/* BCC Field */}
            <div className="space-y-2">
              <Label htmlFor="bcc">BCC</Label>
              <Input
                id="bcc"
                name="bcc"
                type="email"
                value={formData.bcc}
                onChange={handleInputChange}
                placeholder="bcc@example.com"
                className="w-full"
              />
            </div>

            {/* Subject Field */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleInputChange}
                required
                placeholder="Enter email subject"
                className="w-full"
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="flex items-center gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Add Files
                </Button>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {attachments.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {attachments.length} file(s) selected
                  </span>
                )}
              </div>
              
              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Message *</Label>
              <textarea
                id="body"
                name="body"
                value={formData.body}
                onChange={handleInputChange}
                required
                placeholder="Write your message here..."
                className="w-full min-h-[300px] p-3 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {loading ? "Sending..." : "Send Email"}
              </Button>
              <Link href="/emails">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 