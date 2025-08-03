"use client";

import { useNextAuth } from "@/lib/nextauth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheckIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  KeyIcon,
  PhoneIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  LinkIcon,
  GlobeAltIcon,
  MapPinIcon,
  CakeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import type { UserProfile } from "../../types/user";
import { ProfileSectionCard, ProfileField } from "./components";
import { toast } from "sonner";

export default function ProfilePage() {
  const { userProfile, session } = useNextAuth();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Editable profile fields state
  const [profileFields, setProfileFields] = useState<UserProfile | null>(null);

  // Keep profileFields in sync with userProfile
  useEffect(() => {
    if (userProfile) {
      setProfileFields({ 
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.name || '',
        role: (userProfile.role as 'admin' | 'manager' | 'user') || 'user',
        created_at: userProfile.created_at || new Date().toISOString(),
        profile_picture_url: userProfile.profile_picture_url,
      });
    }
  }, [userProfile]);

  // Generate random avatar based on user ID
  const getRandomAvatar = (userId: string) => {
    const avatars = [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=" + userId,
      "https://api.dicebear.com/7.x/bottts/svg?seed=" + userId,
      "https://api.dicebear.com/7.x/personas/svg?seed=" + userId,
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=" + userId,
      "https://api.dicebear.com/7.x/shapes/svg?seed=" + userId
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return avatars[Math.abs(hash) % avatars.length];
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-gradient-to-r from-red-500 to-red-600 text-white border-0";
      case "manager":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0";
      case "user":
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0";
    }
  };

  // Save profile handler
  const handleSaveProfile = async () => {
    if (!session || !profileFields?.id) return;
    setSaveStatus('saving');
    const { error } = await supabase.from('users').update(profileFields).eq('id', profileFields.id);
    
    if (error) {
      setSaveStatus('error');
      toast.error('Failed to update profile: ' + error.message);
    } else {
      setSaveStatus('success');
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error("Failed to update password: " + error.message);
    } else {
      toast.success("Password updated successfully!");
      setNewPassword("");
    }
  };

  const handleCancelEdit = () => {
    if (userProfile) {
      setProfileFields({ 
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.name || '',
        role: (userProfile.role as 'admin' | 'manager' | 'user') || 'user',
        created_at: userProfile.created_at || new Date().toISOString(),
        profile_picture_url: userProfile.profile_picture_url,
      });
    }
    setIsEditing(false);
    setSaveStatus('idle');
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 bg-white/80 backdrop-blur-sm">
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/4" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Profile
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Manage your account information and settings</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Profile Header - Full Width */}
          <div className="xl:col-span-4">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
              <div className="p-8">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  <div className="flex-shrink-0 relative">
                    <div className="relative">
                      <img 
                        src={getRandomAvatar(userProfile.id)} 
                        alt="Profile Avatar"
                        className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl border-4 border-white shadow-2xl"
                      />
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                        <CheckCircleIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
                      <h3 className="text-2xl lg:text-3xl font-bold text-gray-900">{userProfile.name}</h3>
                      <Badge className={`${getRoleBadgeColor(userProfile.role)} px-4 py-1 text-sm font-medium`}>
                        {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-lg mb-3">{userProfile.email}</p>
                    <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-gray-500">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Member since {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Button 
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content - 3 columns on xl screens */}
          <div className="xl:col-span-3 space-y-8">
            {/* Personal Information */}
            <ProfileSectionCard 
              title="Personal Information" 
              onEdit={() => setIsEditing(!isEditing)}
            >
              <div className="space-y-6">
                <ProfileField
                  label="Full Name"
                  value={profileFields?.full_name || ''}
                  icon={<UserIcon className="w-5 h-5" />}
                  isEditable={isEditing}
                  placeholder="Enter your full name"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, full_name: value } : f)}
                />
                
                <ProfileField
                  label="Email Address"
                  value={userProfile.email}
                  icon={<EnvelopeIcon className="w-5 h-5" />}
                  isEditable={false}
                />
                
                <ProfileField
                  label="Phone Number"
                  value={profileFields?.phone || ''}
                  icon={<PhoneIcon className="w-5 h-5" />}
                  isEditable={isEditing}
                  type="tel"
                  placeholder="Enter your phone number"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, phone: value } : f)}
                />
                
                <ProfileField
                  label="Location"
                  value={profileFields?.location || ''}
                  icon={<MapPinIcon className="w-5 h-5" />}
                  isEditable={isEditing}
                  placeholder="Enter your location"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, location: value } : f)}
                />
                
                <ProfileField
                  label="Birthday"
                  value={profileFields?.birthday || ''}
                  icon={<CakeIcon className="w-5 h-5" />}
                  isEditable={isEditing}
                  type="text"
                  placeholder="YYYY-MM-DD"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, birthday: value } : f)}
                />
                
                {isEditing && (
                  <div className="flex gap-3 pt-6 border-t border-gray-100">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={saveStatus === 'saving'}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {saveStatus === 'saving' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </div>
                      ) : saveStatus === 'success' ? (
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="w-4 h-4" />
                          Saved!
                        </div>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancelEdit}
                      className="px-6 py-2 rounded-xl border-gray-300 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </ProfileSectionCard>

            {/* Professional Information */}
            <ProfileSectionCard title="Professional Information">
              <div className="space-y-6">
                <ProfileField
                  label="Job Title"
                  value={profileFields?.job_title || ''}
                  icon={<BriefcaseIcon className="w-5 h-5" />}
                  isEditable={isEditing}
                  placeholder="Enter your job title"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, job_title: value } : f)}
                />
                
                <ProfileField
                  label="Department"
                  value={profileFields?.department || ''}
                  icon={<BuildingOfficeIcon className="w-5 h-5" />}
                  isEditable={isEditing}
                  placeholder="Enter your department"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, department: value } : f)}
                />
              </div>
            </ProfileSectionCard>

            {/* Social Links */}
            <ProfileSectionCard title="Social Links">
              <div className="space-y-6">
                <ProfileField
                  label="LinkedIn"
                  value={profileFields?.linkedin_url || ''}
                  icon={<LinkIcon className="w-5 h-5" />}
                  isEditable={isEditing}
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, linkedin_url: value } : f)}
                />
                
                <ProfileField
                  label="Website"
                  value={profileFields?.website_url || ''}
                  icon={<GlobeAltIcon className="w-5 h-5" />}
                  isEditable={isEditing}
                  type="url"
                  placeholder="https://yourwebsite.com"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, website_url: value } : f)}
                />
              </div>
            </ProfileSectionCard>

            {/* Bio */}
            <ProfileSectionCard title="About">
              <ProfileField
                label="Bio"
                value={profileFields?.bio || ''}
                icon={<UserIcon className="w-5 h-5" />}
                isEditable={isEditing}
                type="textarea"
                placeholder="Tell us about yourself..."
                onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, bio: value } : f)}
              />
            </ProfileSectionCard>
          </div>

          {/* Sidebar - Security Section */}
          <div className="xl:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Security */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ShieldCheckIcon className="w-5 h-5 text-red-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Security</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <KeyIcon className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 mb-2">Change Password</p>
                        <div className="space-y-2">
                          <Input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading}
                            className="w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <Button 
                            onClick={handleChangePassword} 
                            disabled={loading || !newPassword}
                            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                          >
                            {loading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Updating...
                              </div>
                            ) : (
                              'Update Password'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email Verified</span>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Two-Factor Auth</span>
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                      <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                      Not Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Login</span>
                    <span className="text-sm text-gray-900">Today</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
