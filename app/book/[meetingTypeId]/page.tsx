"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone,
  ArrowLeft,
  CheckCircle,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface MeetingType {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  color: string;
  user_id: string;
}

interface UserInfo {
  full_name: string;
  email: string;
}

export default function BookingPage() {
  const params = useParams();
  const meetingTypeId = params.meetingTypeId as string;
  
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: ""
  });

  // Fetch meeting type details
  useEffect(() => {
    async function fetchMeetingType() {
      try {
        const response = await fetch(`/api/meeting-types/${meetingTypeId}`);
        if (!response.ok) {
          throw new Error('Meeting type not found');
        }
        const data = await response.json();
        setMeetingType(data.meeting_type);
        
        // Fetch user info
        const userResponse = await fetch(`/api/users/${data.meeting_type.user_id}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserInfo(userData.user);
        }
      } catch (error) {
        toast.error("Type de rendez-vous introuvable");
      } finally {
        setLoading(false);
      }
    }

    if (meetingTypeId) {
      fetchMeetingType();
    }
  }, [meetingTypeId]);

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && meetingType) {
      fetchAvailableSlots();
    }
  }, [selectedDate, meetingType]);

  const fetchAvailableSlots = async () => {
    try {
      const params = new URLSearchParams({
        userId: meetingType!.user_id,
        meetingTypeId: meetingType!.id,
        date: selectedDate
      });

             const response = await fetch(`/api/bookings/availability?${params}`);
       if (response.ok) {
         const data = await response.json();
         setAvailableSlots(data.availableSlots || []);
       } else {
         const errorData = await response.json();
         console.error('Availability API error:', errorData);
       }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Le nom et l'email sont requis");
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error("Veuillez sélectionner une date et une heure");
      return;
    }

    setBooking(true);

    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}`);
      const endTime = new Date(startTime.getTime() + meetingType!.duration_minutes * 60000);

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_type_id: meetingType!.id,
          host_user_id: meetingType!.user_id,
          guest_name: form.name.trim(),
          guest_email: form.email.trim(),
          guest_phone: form.phone.trim() || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: form.notes.trim() || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          throw new Error('Ce créneau n\'est plus disponible. Veuillez en sélectionner un autre.');
        }
        throw new Error(error.error || 'Failed to create booking');
      }

      toast.success("Réservation confirmée ! Vous recevrez un email de confirmation.");
      
      // Reset form
      setForm({ name: "", email: "", phone: "", notes: "" });
      setSelectedDate("");
      setSelectedTime("");
      setAvailableSlots([]);
      
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la réservation");
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!meetingType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Type de rendez-vous introuvable</h1>
          <p className="text-gray-600 mb-4">Le lien de réservation n'est plus valide.</p>
          <Link href="/">
            <Button className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors duration-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Link>
          
          {userInfo && (
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Réserver avec {userInfo.full_name}
              </h1>
              <p className="text-gray-600 text-lg">{userInfo.email}</p>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Meeting Type Info */}
          <Card className="bg-white border-2 border-gray-200 px-6 py-8 rounded-2xl shadow-xl shadow-primary/5 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-6 h-6 rounded-full shadow-sm"
                  style={{ backgroundColor: meetingType.color }}
                />
                <CardTitle className="text-2xl font-semibold text-gray-900">
                  {meetingType.name}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {meetingType.description && (
                <p className="text-gray-600 text-base leading-relaxed">{meetingType.description}</p>
              )}
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  <Clock className="w-4 h-4" />
                  {meetingType.duration_minutes} minutes
                </div>
                {meetingType.price && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                    {meetingType.price}€
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking Form */}
          <Card className="bg-white border-2 border-gray-200 px-6 py-8 rounded-2xl shadow-xl shadow-primary/5 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Réserver votre créneau
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label htmlFor="date" className="text-sm font-medium text-gray-700 mb-2 block">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all duration-200"
                    required
                  />
                </div>

                {/* Time Selection */}
                {selectedDate && availableSlots.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">Heure *</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          variant={selectedTime === formatTime(slot) ? "default" : "outline"}
                          onClick={() => setSelectedTime(formatTime(slot))}
                          className={`text-sm py-2.5 transition-all duration-200 ${
                            selectedTime === formatTime(slot) 
                              ? "bg-blue-600 text-white hover:bg-blue-700" 
                              : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-500"
                          }`}
                        >
                          {formatTime(slot)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDate && availableSlots.length === 0 && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Aucun créneau disponible pour cette date</p>
                  </div>
                )}

                {/* Guest Information */}
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2 block">Nom complet *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Votre nom complet"
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="votre@email.com"
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-2 block">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all duration-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-2 block">Notes (optionnel)</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Informations supplémentaires..."
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all duration-200"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={booking || !selectedDate || !selectedTime || !form.name || !form.email}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {booking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Réservation en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmer la réservation
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 