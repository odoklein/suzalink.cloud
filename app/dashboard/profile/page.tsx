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
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useRef } from "react";

export default function ProfilePage() {
  const { userProfile, session } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Profile picture upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Placeholder or current profile picture
  const profilePictureUrl = userProfile?.profile_picture_url || "/default-avatar.png";

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

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password too short. It must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      alert("Failed to update password: " + error.message);
    } else {
      alert("Password updated successfully.");
      setNewPassword("");
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !session) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
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
        setUploadError(data.error || "Upload failed");
      } else {
        setUploadSuccess(true);
        setSelectedImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Refresh user profile
        if (userProfile?.id) {
          // @ts-ignore: fetchUserProfile is not exposed, so reload page as fallback
          window.location.reload();
        }
      }
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">Your account information</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center gap-2 pb-4 border-b mb-4">
              <div className="relative w-24 h-24">
                <img
                  src={previewUrl || profilePictureUrl}
                  alt="Profile Preview"
                  className="w-24 h-24 rounded-full object-cover border border-gray-200 shadow-sm"
                />
                {selectedImage && (
                  <button
                    className="absolute top-0 right-0 bg-white rounded-full p-1 border border-gray-300 text-xs"
                    onClick={handleRemoveImage}
                    type="button"
                    aria-label="Remove selected image"
                  >
                    ✕
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                {selectedImage ? "Change" : "Upload"} Profile Picture
              </Button>
              {selectedImage && (
                <Button type="button" className="mt-2" onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Uploading..." : "Save"}
                </Button>
              )}
              {uploadError && <p className="text-red-500 text-sm mt-1">{uploadError}</p>}
              {uploadSuccess && <p className="text-green-600 text-sm mt-1">Profile picture updated!</p>}
            </div>
            {/* End Profile Picture Upload */}

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

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyIcon className="w-5 h-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
            <Button onClick={handleChangePassword} disabled={loading || !newPassword}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
