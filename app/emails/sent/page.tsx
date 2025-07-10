"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, Calendar, User, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EmailMessage {
  uid: string;
  subject: string;
  to: string;
  date: string;
  snippet: string;
  flags: string[];
}

interface SentResponse {
  emails: EmailMessage[];
  total: number;
  message: string;
}

export default function SentPage() {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSentEmails = async () => {
    try {
      setError(null);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Not authenticated");
      }

      // Call the sent emails API (we'll need to create this)
      const response = await fetch('/api/emails/sent', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        // Check if it's an HTML error page
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          throw new Error('Server returned HTML instead of JSON. Check server logs and environment variables.');
        }
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to fetch sent emails');
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }

      const responseText = await response.text();
      console.log('Response text:', responseText.substring(0, 200));
      
      try {
        const data: SentResponse = JSON.parse(responseText);
        setEmails(data.emails);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSentEmails();
  };

  useEffect(() => {
    fetchSentEmails();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sent emails...</p>
        </div>
      </div>
    );
  }

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
            <Send className="h-8 w-8 text-green-600" />
            Sent Emails
          </h1>
          <p className="text-gray-600 mt-1">
            {emails.length > 0 ? `${emails.length} sent emails` : 'No sent emails found'}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <Send className="h-5 w-5" />
              <p className="font-medium">Error loading sent emails</p>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm" 
              className="mt-3"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {emails.length === 0 && !error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sent emails found</h3>
              <p className="text-gray-600 mb-4">
                You haven't sent any emails yet, or there might be an issue with your email connection.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleRefresh} variant="outline">
                  Refresh
                </Button>
                <Link href="/emails/compose">
                  <Button>Compose Email</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <Card 
              key={email.uid} 
              className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {email.subject}
                      </h3>
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                        Sent
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">To: {email.to}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(email.date)}</span>
                      </div>
                    </div>
                    
                    {email.snippet && (
                      <p className="text-gray-700 text-sm line-clamp-2">
                        {email.snippet}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 