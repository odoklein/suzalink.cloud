"use client";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  LinkIcon,
  CalendarIcon,
  ShieldCheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { UserProfile } from "@/app/types/user";
import { toast } from "sonner";

interface UserEditModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: UserProfile) => void;
}

export default function UserEditModal({ user, isOpen, onClose, onSave }: UserEditModalProps) {
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        location: user.location || "",
        job_title: user.job_title || "",
        department: user.department || "",
        bio: user.bio || "",
        birthday: user.birthday || "",
        linkedin_url: user.linkedin_url || "",
        website_url: user.website_url || "",
      });
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: async (updatedData: Partial<UserProfile>) => {
      const response = await fetch(`/api/users/management`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          ...updatedData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Utilisateur mis à jour avec succès");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onSave(data.user);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateUserMutation.mutateAsync(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "manager":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "user":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                  {user.full_name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Modifier l'utilisateur</h2>
                <p className="text-gray-600">Mettez à jour les informations de {user.full_name}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              <XMarkIcon className="w-4 h-4" />
              Fermer
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900 font-semibold">
                <UserIcon className="w-5 h-5 text-gray-600" />
                Informations de base
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-gray-700 font-medium">Nom complet *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name || ""}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    placeholder="Nom complet"
                    required
                    className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="email@example.com"
                    required
                    className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 font-medium">Téléphone</Label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-700 font-medium">Localisation</Label>
                  <div className="relative">
                    <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="location"
                      value={formData.location || ""}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="Paris, France"
                      className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="job_title" className="text-gray-700 font-medium">Poste</Label>
                  <div className="relative">
                    <BriefcaseIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="job_title"
                      value={formData.job_title || ""}
                      onChange={(e) => handleInputChange("job_title", e.target.value)}
                      placeholder="Développeur Full Stack"
                      className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-gray-700 font-medium">Département</Label>
                  <div className="relative">
                    <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="department"
                      value={formData.department || ""}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      placeholder="Développement"
                      className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-700 font-medium">Biographie</Label>
                <Textarea
                  id="bio"
                  value={formData.bio || ""}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Décrivez brièvement l'utilisateur..."
                  rows={3}
                  className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* Role and Permissions */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900 font-semibold">
                <ShieldCheckIcon className="w-5 h-5 text-gray-600" />
                Rôle et permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700 font-medium">Rôle *</Label>
                <select
                  id="role"
                  value={formData.role || "user"}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="user">Utilisateur</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrateur</option>
                </select>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">Rôle actuel:</span>
                  <Badge className={`transition-all duration-200 ${getRoleBadgeColor(formData.role || "user")}`}>
                    {(formData.role || "user").charAt(0).toUpperCase() + (formData.role || "user").slice(1)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="text-gray-900 font-semibold">Informations supplémentaires</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="birthday" className="text-gray-700 font-medium">Date de naissance</Label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="birthday"
                      type="date"
                      value={formData.birthday || ""}
                      onChange={(e) => handleInputChange("birthday", e.target.value)}
                      className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url" className="text-gray-700 font-medium">Profil LinkedIn</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="linkedin_url"
                      type="url"
                      value={formData.linkedin_url || ""}
                      onChange={(e) => handleInputChange("linkedin_url", e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website_url" className="text-gray-700 font-medium">Site web</Label>
                  <div className="relative">
                    <GlobeAltIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url || ""}
                      onChange={(e) => handleInputChange("website_url", e.target.value)}
                      placeholder="https://example.com"
                      className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-300 hover:bg-gray-50 px-4 py-2 transition-all duration-200"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 