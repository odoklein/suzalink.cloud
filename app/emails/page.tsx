"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Inbox, 
  Send, 
  Mail, 
  Plus,
  RefreshCw,
  Settings
} from "lucide-react";

const emailSections = [
  {
    title: "Inbox",
    description: "View and manage your incoming emails",
    icon: Inbox,
    href: "/emails/inbox",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  {
    title: "Sent",
    description: "View emails you've sent",
    icon: Send,
    href: "/emails/sent",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  {
    title: "Compose",
    description: "Write and send new emails",
    icon: Plus,
    href: "/emails/compose",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  }
];

export default function EmailPage() {
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false); // This would be fetched from your email connection status

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Mail className="h-8 w-8 text-blue-600" />
            Email Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your emails, compose messages, and stay organized
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <p className="font-medium">
                  {isConnected ? 'Email Connected' : 'No Email Account Connected'}
                </p>
                <p className="text-sm text-gray-600">
                  {isConnected ? 'Your email account is ready to use' : 'Connect your email account to get started'}
                </p>
              </div>
            </div>
            {!isConnected && (
              <Link href="/emails/connect">
                <Button>Connect Email</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {emailSections.map((section) => {
          const Icon = section.icon;
          const isActive = pathname === section.href;
          
          return (
            <Link key={section.href} href={section.href}>
              <Card 
                className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-2 ${
                  isActive 
                    ? `${section.borderColor} shadow-md` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${section.bgColor}`}>
                      <Icon className={`h-6 w-6 ${section.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{section.title}</h3>
                      <p className="text-gray-600 text-sm">{section.description}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs text-blue-600 font-medium">Currently viewing</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Inbox className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Mail className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sent Today</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <Send className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 