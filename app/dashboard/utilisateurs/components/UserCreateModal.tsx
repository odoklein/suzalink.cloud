"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  XMarkIcon,
  PlusIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateUserData {
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user';
  phone?: string;
  location?: string;
  job_title?: string;
  department?: string;
  bio?: string;
  birthday?: string;
  linkedin_url?: string;
  website_url?: string;
}

export default function UserCreateModal({ isOpen, onClose, onSuccess }: UserCreateModalProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    full_name: "",
    role: "user",
    phone: "",
    location: "",
    job_title: "",
    department: "",
    bio: "",
    birthday: "",
    linkedin_url: "",
    website_url: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const response = await fetch(`/api/users/management`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Utilisateur créé avec succès");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de la création: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      full_name: "",
      role: "user",
      phone: "",
      location: "",
      job_title: "",
      department: "",
      bio: "",
      birthday: "",
      linkedin_url: "",
      website_url: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createUserMutation.mutateAsync(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateUserData, value: string) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <PlusIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Créer un nouvel utilisateur</h2>
                <p className="text-gray-600">Ajoutez un nouvel utilisateur au système</p>
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
                    value={formData.full_name}
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
                    value={formData.email}
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
                      value={formData.phone}
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
                      value={formData.location}
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
                      value={formData.job_title}
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
                      value={formData.department}
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
                  value={formData.bio}
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
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="user">Utilisateur</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrateur</option>
                </select>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500">Rôle sélectionné:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 ${getRoleBadgeColor(formData.role)}`}>
                    {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
                  </span>
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
                      value={formData.birthday}
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
                      value={formData.linkedin_url}
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
                      value={formData.website_url}
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
              {isLoading ? "Création..." : "Créer l'utilisateur"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 