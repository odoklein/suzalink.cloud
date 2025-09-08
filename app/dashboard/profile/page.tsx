"use client";

import { useNextAuth } from "@/lib/nextauth-context";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheckIcon,
  UserIcon,
  CalendarIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import type { UserProfile } from "../../types/user";
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
        return "bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-md";
      case "manager":
        return "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md";
      case "user":
        return "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-md";
      default:
        return "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 shadow-md";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrateur";
      case "manager":
        return "Gestionnaire";
      case "user":
        return "Utilisateur";
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  // Save profile handler
  const handleSaveProfile = async () => {
    if (!session || !profileFields?.id) return;
    setSaveStatus('saving');
    const { error } = await supabase.from('users').update(profileFields).eq('id', profileFields.id);
    
    if (error) {
      setSaveStatus('error');
      toast.error('Échec de la mise à jour du profil: ' + error.message);
    } else {
      setSaveStatus('success');
      toast.success('Profil mis à jour avec succès!');
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
      toast.error("Échec de la mise à jour du mot de passe: " + error.message);
    } else {
      toast.success("Mot de passe mis à jour avec succès!");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="w-full p-6 lg:p-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
              <UserIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Profil
              </h1>
              <p className="text-gray-600 mt-1 text-lg">Gérez les informations et paramètres de votre compte</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Profile Header - Full Width */}
          <div className="xl:col-span-12">
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-8 hover:shadow-md transition-shadow duration-300">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                <div className="relative group">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg group-hover:scale-105 transition-transform duration-200">
                    {userProfile.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-md">
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex-1 text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
                    <h3 className="text-3xl font-bold text-gray-900">{userProfile.name}</h3>
                    <Badge className={`${getRoleBadgeColor(userProfile.role)} px-4 py-2 text-sm font-semibold shadow-sm`}>
                      {getRoleDisplayName(userProfile.role)}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-lg mb-3">{userProfile.email}</p>
                  <div className="flex items-center justify-center lg:justify-start gap-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-5 h-5" />
                      <span className="font-medium">Membre depuis le {userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Inconnu'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {isEditing ? 'Annuler la modification' : 'Modifier le profil'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - 8 columns on xl screens */}
          <div className="xl:col-span-8 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <UserIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Informations Personnelles</h2>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Nom complet</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileFields?.full_name || ''}
                          onChange={(e) => setProfileFields((f: UserProfile | null) => f ? { ...f, full_name: e.target.value } : f)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                          placeholder="Entrez votre nom complet"
                        />
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-gray-900 font-medium">{profileFields?.full_name || 'Non défini'}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Adresse email</label>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-gray-900 font-medium">{userProfile.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Numéro de téléphone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={profileFields?.phone || ''}
                          onChange={(e) => setProfileFields((f: UserProfile | null) => f ? { ...f, phone: e.target.value } : f)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                          placeholder="Entrez votre numéro de téléphone"
                        />
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-gray-900 font-medium">{profileFields?.phone || 'Non défini'}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Localisation</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileFields?.location || ''}
                          onChange={(e) => setProfileFields((f: UserProfile | null) => f ? { ...f, location: e.target.value } : f)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                          placeholder="Entrez votre localisation"
                        />
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-gray-900 font-medium">{profileFields?.location || 'Non définie'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Biographie</label>
                    {isEditing ? (
                      <textarea
                        value={profileFields?.bio || ''}
                        onChange={(e) => setProfileFields((f: UserProfile | null) => f ? { ...f, bio: e.target.value } : f)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 h-32 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                        placeholder="Parlez-nous de vous..."
                      />
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-gray-900 font-medium leading-relaxed">{profileFields?.bio || 'Non définie'}</p>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saveStatus === 'saving'}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {saveStatus === 'saving' ? 'Enregistrement...' : 'Sauvegarder les modifications'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-50 transition-all duration-200"
                      >
                        Annuler
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - 4 columns */}
          <div className="xl:col-span-4 space-y-6">
            {/* Security */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-red-100 to-red-200 rounded-lg">
                    <ShieldCheckIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Sécurité</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Changer le mot de passe</label>
                    <input
                      type="password"
                      placeholder="Nouveau mot de passe"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white"
                    />
                    <Button
                      onClick={handleChangePassword}
                      disabled={loading || !newPassword}
                      className="w-full mt-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Mise à jour...
                        </div>
                      ) : (
                        'Mettre à jour le mot de passe'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg">
                    <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Statut du compte</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                    <span className="text-sm font-semibold text-gray-700">Email vérifié</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1">
                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                      Vérifié
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Authentification à deux facteurs</span>
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200 px-3 py-1">
                      <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                      Non activé
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <span className="text-sm font-semibold text-gray-700">Dernière connexion</span>
                    <span className="text-sm font-bold text-blue-700">Aujourd'hui</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                    <KeyIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Statistiques rapides</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">0</div>
                    <div className="text-xs text-blue-700 font-medium">Projets</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <div className="text-xs text-green-700 font-medium">Clients</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">0</div>
                    <div className="text-xs text-purple-700 font-medium">Emails</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">0</div>
                    <div className="text-xs text-orange-700 font-medium">Tâches</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
