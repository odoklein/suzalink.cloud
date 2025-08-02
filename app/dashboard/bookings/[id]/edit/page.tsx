"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone,
  ArrowLeft,
  Save,
  X,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  meeting_link?: string;
  location?: string;
  meeting_types: {
    id: string;
    name: string;
    duration_minutes: number;
    color: string;
  };
  clients?: {
    id: string;
    name: string;
    contact_email: string;
  };
  prospects?: {
    id: string;
    name: string;
    email: string;
  };
}

interface MeetingType {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price?: number;
  color: string;
  is_active: boolean;
}

export default function BookingEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bookingId = params.id as string;
  
  // Validate booking ID format
  const isValidBookingId = bookingId && bookingId.length > 0 && /^[a-zA-Z0-9-]+$/.test(bookingId);
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    notes: "",
    status: "pending" as Booking['status'],
    meeting_type_id: "",
    start_time: "",
    end_time: ""
  });

  // Fetch booking details and meeting types
  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching booking with ID:', bookingId);
        
        // First, try to fetch from the specific booking endpoint
        const bookingResponse = await fetch(`/api/bookings/${bookingId}`);
        console.log('Booking response status:', bookingResponse.status);
        
        if (!bookingResponse.ok) {
          const errorData = await bookingResponse.json().catch(() => ({}));
          console.error('Booking fetch error:', errorData);
          
          // If the specific booking endpoint fails, try to find it in the user's bookings
          console.log('Trying to find booking in user bookings list...');
          const userBookingsResponse = await fetch(`/api/bookings?userId=${user?.id}`);
          
          if (userBookingsResponse.ok) {
            const userBookingsData = await userBookingsResponse.json();
            const foundBooking = userBookingsData.bookings?.find((b: any) => b.id === bookingId);
            
            if (foundBooking) {
              console.log('Found booking in user bookings list:', foundBooking);
              setBooking(foundBooking);
              
              // Pre-populate form
              setForm({
                guest_name: foundBooking.guest_name,
                guest_email: foundBooking.guest_email,
                guest_phone: foundBooking.guest_phone || "",
                notes: foundBooking.notes || "",
                status: foundBooking.status,
                meeting_type_id: foundBooking.meeting_types.id,
                start_time: foundBooking.start_time,
                end_time: foundBooking.end_time
              });
            } else {
              throw new Error('Booking not found in user bookings');
            }
          } else {
            throw new Error(errorData.error || 'Booking not found');
          }
        } else {
          const bookingData = await bookingResponse.json();
          console.log('Booking data:', bookingData);
          
          if (!bookingData.booking) {
            throw new Error('No booking data received');
          }
          
          setBooking(bookingData.booking);
          
          // Pre-populate form
          const booking = bookingData.booking;
          setForm({
            guest_name: booking.guest_name,
            guest_email: booking.guest_email,
            guest_phone: booking.guest_phone || "",
            notes: booking.notes || "",
            status: booking.status,
            meeting_type_id: booking.meeting_types.id,
            start_time: booking.start_time,
            end_time: booking.end_time
          });
        }

        // Fetch meeting types
        const meetingTypesResponse = await fetch('/api/meeting-types');
        if (meetingTypesResponse.ok) {
          const meetingTypesData = await meetingTypesResponse.json();
          setMeetingTypes(meetingTypesData.meeting_types || []);
        }
      } catch (error: any) {
        console.error('Error fetching booking:', error);
        toast.error(error.message || "Réservation introuvable");
        router.push('/dashboard/bookings');
      } finally {
        setLoading(false);
      }
    }

    if (bookingId && user?.id && isValidBookingId) {
      fetchData();
    } else if (!isValidBookingId) {
      console.error('Invalid booking ID format:', bookingId);
      toast.error('Format d\'ID de réservation invalide');
      router.push('/dashboard/bookings');
    }
  }, [bookingId, router, user?.id, isValidBookingId]);

  // Fetch available slots when date/time changes
  useEffect(() => {
    if (form.start_time && form.meeting_type_id) {
      fetchAvailableSlots();
    }
  }, [form.start_time, form.meeting_type_id]);

  const fetchAvailableSlots = async () => {
    try {
      const startDate = new Date(form.start_time);
      const dateString = startDate.toISOString().split('T')[0];
      
      const params = new URLSearchParams({
        userId: user?.id || '',
        meetingTypeId: form.meeting_type_id,
        date: dateString,
        excludeBookingId: bookingId // Exclude current booking from conflicts
      });

      const response = await fetch(`/api/bookings/availability?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.guest_name.trim() || !form.guest_email.trim()) {
      toast.error("Le nom et l'email sont requis");
      return;
    }

    if (!form.start_time || !form.end_time) {
      toast.error("Veuillez sélectionner une date et une heure");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: form.guest_name.trim(),
          guest_email: form.guest_email.trim(),
          guest_phone: form.guest_phone.trim() || null,
          start_time: form.start_time,
          end_time: form.end_time,
          notes: form.notes.trim() || null,
          status: form.status,
          meeting_type_id: form.meeting_type_id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          throw new Error('Ce créneau n\'est plus disponible. Veuillez en sélectionner un autre.');
        }
        throw new Error(error.error || 'Failed to update booking');
      }

      toast.success("Réservation mise à jour avec succès !");
      router.push('/dashboard/bookings');
      
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const currentTime = form.start_time ? new Date(form.start_time).toTimeString().slice(0, 5) : '';
    const newDateTime = newDate + 'T' + currentTime;
    
    setForm(prev => ({
      ...prev,
      start_time: newDateTime,
      end_time: newDateTime
    }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    const currentDate = form.start_time ? new Date(form.start_time).toISOString().split('T')[0] : '';
    const newDateTime = currentDate + 'T' + newTime;
    
    // Calculate end time based on meeting type duration
    const selectedMeetingType = meetingTypes.find(mt => mt.id === form.meeting_type_id);
    if (selectedMeetingType) {
      const startTime = new Date(newDateTime);
      const endTime = new Date(startTime.getTime() + selectedMeetingType.duration_minutes * 60000);
      
      setForm(prev => ({
        ...prev,
        start_time: newDateTime,
        end_time: endTime.toISOString()
      }));
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
          <p className="text-sm text-gray-500 mt-2">ID de réservation: {bookingId}</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Réservation introuvable</h1>
          <p className="text-gray-600 mb-4">
            La réservation que vous recherchez n'existe pas ou vous n'avez pas les permissions pour y accéder.
          </p>
          <div className="bg-gray-100 p-4 rounded-lg mb-4 text-left max-w-md mx-auto">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Détails de débogage:</strong>
            </p>
            <p className="text-xs text-gray-600">ID de réservation: {bookingId}</p>
            <p className="text-xs text-gray-600">ID utilisateur: {user?.id}</p>
            <p className="text-xs text-gray-600">Format ID valide: {isValidBookingId ? 'Oui' : 'Non'}</p>
            <p className="text-xs text-gray-600">Utilisateur connecté: {user ? 'Oui' : 'Non'}</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard/bookings">
              <Button className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                Retour aux réservations
              </Button>
            </Link>
            <Button 
              variant="outline"
              onClick={() => window.location.reload()}
              className="px-3 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/bookings" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors duration-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux réservations
          </Link>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Modifier la réservation
            </h1>
            <p className="text-gray-600 text-lg">
              {booking.meeting_types.name} - {formatDate(booking.start_time)}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Current Booking Info */}
          <Card className="bg-white border-2 border-gray-200 px-6 py-8 rounded-2xl shadow-xl shadow-primary/5 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-6 h-6 rounded-full shadow-sm"
                  style={{ backgroundColor: booking.meeting_types.color }}
                />
                <CardTitle className="text-2xl font-semibold text-gray-900">
                  Réservation actuelle
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(booking.start_time)}</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{booking.guest_name}</p>
                    <p className="text-sm text-gray-600">{booking.guest_email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{booking.meeting_types.name}</p>
                    <p className="text-sm text-gray-600">{booking.meeting_types.duration_minutes} minutes</p>
                  </div>
                </div>

                <Badge className={`${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}>
                  {booking.status === 'confirmed' ? 'Confirmé' :
                   booking.status === 'pending' ? 'En attente' :
                   booking.status === 'cancelled' ? 'Annulé' :
                   'Terminé'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          <Card className="bg-white border-2 border-gray-200 px-6 py-8 rounded-2xl shadow-xl shadow-primary/5 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-semibold text-gray-900">
                Modifier les détails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Meeting Type */}
                <div className="space-y-2">
                  <Label htmlFor="meeting_type">Type de rendez-vous</Label>
                  <Select 
                    value={form.meeting_type_id} 
                    onValueChange={(value) => setForm(prev => ({ ...prev, meeting_type_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type de rendez-vous" />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingTypes.map((meetingType) => (
                        <SelectItem key={meetingType.id} value={meetingType.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: meetingType.color }}
                            />
                            {meetingType.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.start_time ? new Date(form.start_time).toISOString().split('T')[0] : ''}
                      onChange={handleDateChange}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure</Label>
                    <Input
                      id="time"
                      type="time"
                      value={form.start_time ? new Date(form.start_time).toTimeString().slice(0, 5) : ''}
                      onChange={handleTimeChange}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Guest Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Informations client</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guest_name">Nom complet *</Label>
                    <Input
                      id="guest_name"
                      type="text"
                      value={form.guest_name}
                      onChange={(e) => setForm(prev => ({ ...prev, guest_name: e.target.value }))}
                      placeholder="Nom du client"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guest_email">Email *</Label>
                    <Input
                      id="guest_email"
                      type="email"
                      value={form.guest_email}
                      onChange={(e) => setForm(prev => ({ ...prev, guest_email: e.target.value }))}
                      placeholder="email@exemple.com"
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guest_phone">Téléphone</Label>
                    <Input
                      id="guest_phone"
                      type="tel"
                      value={form.guest_phone}
                      onChange={(e) => setForm(prev => ({ ...prev, guest_phone: e.target.value }))}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select 
                    value={form.status} 
                    onValueChange={(value: Booking['status']) => setForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="confirmed">Confirmé</SelectItem>
                      <SelectItem value="cancelled">Annulé</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes additionnelles..."
                    rows={3}
                    className="w-full"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/dashboard/bookings')}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 