"use client";

import { useAuth } from "@/lib/auth-context";
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
  CakeIcon
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useState, useRef, useEffect } from "react";
import type { UserProfile } from "../../types/user";
import { ProfileSectionCard, ProfileAvatar, ProfileField } from "./components";

export default function ProfilePage() {
  const { userProfile, session } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Editable profile fields state
  const [profileFields, setProfileFields] = useState<UserProfile | null>(null);

  // Keep profileFields in sync with userProfile
  useEffect(() => {
    if (userProfile) setProfileFields({ ...userProfile });
  }, [userProfile]);

  const profilePictureUrl =
    userProfile?.profile_picture_url?.startsWith("http")
      ? userProfile.profile_picture_url
      : "/default-avatar.png";

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "user":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Save profile handler
  const handleSaveProfile = async () => {
    if (!session || !profileFields?.id) return;
    setLoading(true);
    const { error } = await supabase.from('users').update(profileFields).eq('id', profileFields.id);
    setLoading(false);
    if (error) {
      alert('Failed to update profile: ' + error.message);
    } else {
      alert('Profile updated!');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Mot de passe trop court. Il doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      alert("Échec de la mise à jour du mot de passe : " + error.message);
    } else {
      alert("Mot de passe mis à jour avec succès.");
      setNewPassword("");
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !session || !userProfile?.id) {
      alert("Session ou profil utilisateur introuvable. Veuillez réessayer.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedImage);
      const res = await fetch("/api/users/profile-picture", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Échec de l'envoi");
      } else {
        alert("Photo de profil mise à jour !");
        setSelectedImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || "Échec de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-2xl w-full p-8">
          <Skeleton className="h-8 w-1/3 mb-6" />
          <Skeleton className="h-6 w-1/2 mb-4" />
          <Skeleton className="h-5 w-1/4 mb-4" />
          <Skeleton className="h-5 w-1/4 mb-4" />
          <Skeleton className="h-5 w-1/4 mb-4" />
          <Skeleton className="h-5 w-1/4" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <div className="w-full">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Manage your account information and settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 lg:gap-6 xl:gap-8">
          {/* Profile Picture & Basic Info */}
          <div className="lg:col-span-1">
            <ProfileSectionCard title="Profile Picture">
              <div className="flex flex-col items-center space-y-4">
                <ProfileAvatar 
                  src={previewUrl || profilePictureUrl}
                  alt="Profile picture"
                  size="lg"
                />
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">{userProfile.full_name}</h3>
                  <p className="text-sm text-gray-600">{userProfile.email}</p>
                  <Badge className={getRoleBadgeColor(userProfile.role)}>
                    {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                  </Badge>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                />
                
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    {selectedImage ? "Change" : "Upload"} Photo
                  </Button>
                  
                  {selectedImage && (
                    <Button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? "Uploading..." : "Save Photo"}
                    </Button>
                  )}
                </div>
              </div>
            </ProfileSectionCard>

            {/* Account Info */}
            <div className="mt-6">
              <ProfileSectionCard title="Account Information">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Member Since</p>
                      <p className="text-sm text-gray-900">
                        {new Date(userProfile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </ProfileSectionCard>
            </div>
          </div>

          {/* Main Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <ProfileSectionCard 
              title="Personal Information" 
              onEdit={() => setIsEditing(!isEditing)}
            >
              <div className="space-y-6">
                <ProfileField
                  label="Full Name"
                  value={profileFields?.full_name || ''}
                  icon={<UserIcon className="w-4 h-4" />}
                  isEditable={isEditing}
                  placeholder="Enter your full name"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, full_name: value } : f)}
                />
                
                <ProfileField
                  label="Email Address"
                  value={userProfile.email}
                  icon={<EnvelopeIcon className="w-4 h-4" />}
                  isEditable={false}
                />
                
                <ProfileField
                  label="Phone Number"
                  value={profileFields?.phone || ''}
                  icon={<PhoneIcon className="w-4 h-4" />}
                  isEditable={isEditing}
                  type="tel"
                  placeholder="Enter your phone number"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, phone: value } : f)}
                />
                
                <ProfileField
                  label="Location"
                  value={profileFields?.location || ''}
                  icon={<MapPinIcon className="w-4 h-4" />}
                  isEditable={isEditing}
                  placeholder="Enter your location"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, location: value } : f)}
                />
                
                <ProfileField
                  label="Birthday"
                  value={profileFields?.birthday || ''}
                  icon={<CakeIcon className="w-4 h-4" />}
                  isEditable={isEditing}
                  type="text"
                  placeholder="YYYY-MM-DD"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, birthday: value } : f)}
                />
                
                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveProfile} disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
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
                  icon={<BriefcaseIcon className="w-4 h-4" />}
                  isEditable={isEditing}
                  placeholder="Enter your job title"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, job_title: value } : f)}
                />
                
                <ProfileField
                  label="Department"
                  value={profileFields?.department || ''}
                  icon={<BuildingOfficeIcon className="w-4 h-4" />}
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
                  icon={<LinkIcon className="w-4 h-4" />}
                  isEditable={isEditing}
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, linkedin_url: value } : f)}
                />
                
                <ProfileField
                  label="Website"
                  value={profileFields?.website_url || ''}
                  icon={<GlobeAltIcon className="w-4 h-4" />}
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
                icon={<UserIcon className="w-4 h-4" />}
                isEditable={isEditing}
                type="textarea"
                placeholder="Tell us about yourself..."
                onChange={(value) => setProfileFields((f: UserProfile | null) => f ? { ...f, bio: value } : f)}
              />
            </ProfileSectionCard>

            {/* Change Password */}
            <ProfileSectionCard title="Security">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <KeyIcon className="w-4 h-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700 mb-2">Change Password</p>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={loading}
                        className="max-w-xs"
                      />
                      <Button 
                        onClick={handleChangePassword} 
                        disabled={loading || !newPassword}
                        variant="outline"
                      >
                        {loading ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ProfileSectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
