"use client";
import { useState, useEffect } from "react";
import { useNextAuth } from "@/lib/nextauth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  Save, 
  Globe,
  Settings,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CalendarSettings {
  id: string;
  user_id: string;
  timezone: string;
  working_hours: {
    [key: string]: {
      start: string;
      end: string;
      enabled: boolean;
    };
  };
  break_time_minutes: number;
  slot_duration_minutes: number;
  advance_booking_days: number;
  created_at: string;
  updated_at: string;
}

const timezones = [
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+10)' },
  { value: 'UTC', label: 'UTC (UTC+0)' }
];

const daysOfWeek = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' }
];

const slotDurations = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 heure' },
  { value: 90, label: '1 heure 30' },
  { value: 120, label: '2 heures' }
];

export default function CalendarSettingsPage() {
  const { user } = useNextAuth();
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState<CalendarSettings>({
    id: '',
    user_id: user?.id || '',
    timezone: 'Europe/Paris',
    working_hours: {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '09:00', end: '17:00', enabled: false },
      sunday: { start: '09:00', end: '17:00', enabled: false }
    },
    break_time_minutes: 60,
    slot_duration_minutes: 30,
    advance_booking_days: 30,
    created_at: '',
    updated_at: ''
  });

  // Fetch calendar settings
  const {
    data: settingsData,
    isLoading: loadingSettings,
    error: settingsError
  } = useQuery<{ calendar_settings: CalendarSettings }, Error>({
    queryKey: ["calendar-settings", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/calendar-settings?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch calendar settings');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: CalendarSettings) => {
      const response = await fetch('/api/calendar-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update calendar settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Paramètres du calendrier mis à jour');
      queryClient.invalidateQueries({ queryKey: ["calendar-settings", user?.id] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour des paramètres');
    }
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (settingsData?.calendar_settings) {
      setSettings(settingsData.calendar_settings);
    }
  }, [settingsData]);

  const handleWorkingHoursChange = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day],
          [field]: value
        }
      }
    }));
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleQuickPreset = (preset: 'business' | 'flexible' | 'weekend') => {
    let newWorkingHours = { ...settings.working_hours };
    
    switch (preset) {
      case 'business':
        newWorkingHours = {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: false },
          sunday: { start: '09:00', end: '17:00', enabled: false }
        };
        break;
      case 'flexible':
        newWorkingHours = {
          monday: { start: '08:00', end: '18:00', enabled: true },
          tuesday: { start: '08:00', end: '18:00', enabled: true },
          wednesday: { start: '08:00', end: '18:00', enabled: true },
          thursday: { start: '08:00', end: '18:00', enabled: true },
          friday: { start: '08:00', end: '18:00', enabled: true },
          saturday: { start: '10:00', end: '16:00', enabled: true },
          sunday: { start: '10:00', end: '16:00', enabled: false }
        };
        break;
      case 'weekend':
        newWorkingHours = {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '09:00', end: '17:00', enabled: true },
          sunday: { start: '09:00', end: '17:00', enabled: true }
        };
        break;
    }
    
    setSettings(prev => ({
      ...prev,
      working_hours: newWorkingHours
    }));
  };

  if (loadingSettings) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/bookings">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres du calendrier</h1>
          <p className="text-gray-600">Configurez vos disponibilités et préférences de réservation</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Settings */}
        <Card className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl shadow-primary/5 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Paramètres généraux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm font-medium text-gray-700">
                Fuseau horaire
              </Label>
              <Select
                value={settings.timezone}
                onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez un fuseau horaire" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slot Duration */}
            <div className="space-y-2">
              <Label htmlFor="slot-duration" className="text-sm font-medium text-gray-700">
                Durée des créneaux
              </Label>
              <Select
                value={settings.slot_duration_minutes.toString()}
                onValueChange={(value) => setSettings(prev => ({ ...prev, slot_duration_minutes: parseInt(value) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez la durée" />
                </SelectTrigger>
                <SelectContent>
                  {slotDurations.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value.toString()}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Break Time */}
            <div className="space-y-2">
              <Label htmlFor="break-time" className="text-sm font-medium text-gray-700">
                Pause entre les rendez-vous (minutes)
              </Label>
              <Input
                id="break-time"
                type="number"
                min="0"
                max="120"
                value={settings.break_time_minutes}
                onChange={(e) => setSettings(prev => ({ ...prev, break_time_minutes: parseInt(e.target.value) || 0 }))}
                className="w-full"
              />
            </div>

            {/* Advance Booking Days */}
            <div className="space-y-2">
              <Label htmlFor="advance-booking" className="text-sm font-medium text-gray-700">
                Réservation à l&apos;avance (jours)
              </Label>
              <Input
                id="advance-booking"
                type="number"
                min="1"
                max="365"
                value={settings.advance_booking_days}
                onChange={(e) => setSettings(prev => ({ ...prev, advance_booking_days: parseInt(e.target.value) || 1 }))}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card className="bg-white border-2 border-gray-200 rounded-2xl shadow-xl shadow-primary/5 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Heures de travail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Presets */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Préréglages rapides</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset('business')}
                  className="text-xs"
                >
                  Horaires classiques
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset('flexible')}
                  className="text-xs"
                >
                  Horaires flexibles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset('weekend')}
                  className="text-xs"
                >
                  Inclure week-end
                </Button>
              </div>
            </div>

                         {/* Working Hours by Day */}
             <div className="space-y-3">
               {daysOfWeek.map((day) => {
                 const daySettings = settings.working_hours[day.key] || { start: '09:00', end: '17:00', enabled: false };
                 
                 return (
                   <div key={day.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                     <div className="flex items-center gap-2 min-w-[100px]">
                       <Switch
                         checked={daySettings.enabled}
                         onCheckedChange={(checked) => handleWorkingHoursChange(day.key, 'enabled', checked)}
                       />
                       <span className="text-sm font-medium text-gray-700">{day.label}</span>
                     </div>
                     
                     {daySettings.enabled && (
                       <div className="flex items-center gap-2 flex-1">
                         <Input
                           type="time"
                           value={daySettings.start}
                           onChange={(e) => handleWorkingHoursChange(day.key, 'start', e.target.value)}
                           className="w-24"
                         />
                         <span className="text-gray-500">à</span>
                         <Input
                           type="time"
                           value={daySettings.end}
                           onChange={(e) => handleWorkingHoursChange(day.key, 'end', e.target.value)}
                           className="w-24"
                         />
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {updateSettingsMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
        </Button>
      </div>
    </div>
  );
} 