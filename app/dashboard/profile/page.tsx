"use client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon, UserIcon, EnvelopeIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { userProfile } = useAuth();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-2xl w-full p-8">
          <Skeleton className="h-8 w-1/3 mb-6" /> {/* Title */}
          <Skeleton className="h-6 w-1/2 mb-4" /> {/* Subtitle */}
          <Skeleton className="h-5 w-1/4 mb-4" /> {/* Email */}
          <Skeleton className="h-5 w-1/4 mb-4" /> {/* Full Name */}
          <Skeleton className="h-5 w-1/4 mb-4" /> {/* Role */}
          <Skeleton className="h-5 w-1/4" /> {/* Member Since */}
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">Your account information</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900">{userProfile.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <UserIcon className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Full Name</p>
                <p className="text-gray-900">{userProfile.full_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Role</p>
                <Badge className={getRoleBadgeColor(userProfile.role)}>
                  {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CalendarIcon className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Member Since</p>
                <p className="text-gray-900">
                  {new Date(userProfile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 