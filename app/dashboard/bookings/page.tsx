"use client";
import { useState, useEffect } from "react";
import { useNextAuth } from "@/lib/nextauth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  ExternalLink,
  Video,
  MapPin,
  Mail,
  Phone,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from '@tanstack/react-query';
import CalendarComponent from "@/components/Calendar";
import BookingDetailsModal from "@/components/BookingDetailsModal";

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

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200'
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors]}`}>
    {status === 'pending' ? 'En attente' : 
     status === 'confirmed' ? 'Confirmé' : 
     status === 'cancelled' ? 'Annulé' : 
     status === 'completed' ? 'Terminé' : status}
  </span>
);

export default function BookingsPage() {
  const { user } = useNextAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Fetch bookings
  const {
    data: bookingsData,
    isLoading: loadingBookings,
    refetch: refetchBookings
  } = useQuery<{ bookings: Booking[] }, Error>({
    queryKey: ["bookings", user?.id],
    queryFn: async () => {
      // Fetch all bookings for the user (no date filter for calendar view)
      const params = new URLSearchParams({
        userId: user?.id || ''
      });

      const response = await fetch(`/api/bookings?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Fetch meeting types
  const {
    data: meetingTypesData,
    isLoading: loadingMeetingTypes
  } = useQuery<{ meeting_types: MeetingType[] }, Error>({
    queryKey: ["meeting-types", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/meeting-types?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meeting types');
      }
      return response.json();
    },
    enabled: !!user
  });

  const bookings = bookingsData?.bookings || [];
  const meetingTypes = meetingTypesData?.meeting_types || [];

  const todayBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.start_time);
    const today = new Date();
    return bookingDate.toDateString() === today.toDateString();
  });

  const upcomingBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.start_time);
    const now = new Date();
    return bookingDate > now && booking.status === 'confirmed';
  }).slice(0, 5);

  // Handle booking click
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsBookingModalOpen(true);
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle booking edit
  const handleEditBooking = (booking: Booking) => {
    router.push(`/dashboard/bookings/${booking.id}/edit`);
  };

  // Handle booking actions
  const handleStatusChange = async (bookingId: string, status: Booking['status']) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      toast.success('Statut de la réservation mis à jour');
      refetchBookings();
      setIsBookingModalOpen(false);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }

      toast.success('Réservation supprimée');
      refetchBookings();
      setIsBookingModalOpen(false);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loadingBookings || loadingMeetingTypes) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Réservations</h1>
          <p className="text-gray-600">Gérez vos rendez-vous et disponibilités</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetchBookings()}
            className="px-3 py-2.5 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}
            className="px-3 py-2.5 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            {view === 'calendar' ? <Users className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            {view === 'calendar' ? 'Vue liste' : 'Vue calendrier'}
          </Button>
          <Link href="/dashboard/bookings/meeting-types">
            <Button 
              variant="outline"
              className="px-3 py-2.5 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Types de RDV
            </Button>
          </Link>
          <Link href="/dashboard/bookings/settings">
            <Button 
              variant="outline"
              className="px-3 py-2.5 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </Button>
          </Link>
          <Link href="/dashboard/bookings/new">
            <Button 
              className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau RDV
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aujourd&apos;hui</p>
                <p className="text-2xl font-bold text-gray-900">{todayBookings.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">À venir</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingBookings.length}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Types de RDV</p>
                <p className="text-2xl font-bold text-gray-900">{meetingTypes.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de remplissage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookings.length > 0 ? Math.round((bookings.filter(b => b.status === 'confirmed').length / bookings.length) * 100) : 0}%
                </p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Types Section */}
      {meetingTypes.length > 0 ? (
        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Types de rendez-vous</CardTitle>
              <Link href="/dashboard/bookings/meeting-types">
                <Button 
                  variant="outline"
                  size="sm"
                  className="px-3 py-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Gérer
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {meetingTypes.map((meetingType) => (
                <div key={meetingType.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: meetingType.color }}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{meetingType.name}</h3>
                        <p className="text-sm text-gray-600">{meetingType.duration_minutes} minutes</p>
                      </div>
                    </div>
                    <Badge 
                      className={`${
                        meetingType.is_active 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {meetingType.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  
                  {meetingType.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {meetingType.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {meetingType.price && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {meetingType.price}€
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {meetingType.duration_minutes}min
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const bookingUrl = `${window.location.origin}/book/${meetingType.id}`;
                          navigator.clipboard.writeText(bookingUrl);
                          toast.success('Lien de réservation copié !');
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Copier le lien de réservation"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Link href={`/dashboard/bookings/meeting-types/${meetingType.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Modifier"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardContent>
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun type de rendez-vous</h3>
              <p className="text-gray-600 mb-4">
                Créez votre premier type de rendez-vous pour commencer à recevoir des réservations.
              </p>
              <Link href="/dashboard/bookings/meeting-types">
                <Button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700">
                  Créer un type de RDV
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Bookings */}
      {todayBookings.length > 0 && (
        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Rendez-vous d&apos;aujourd&apos;hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: booking.meeting_types.color }}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{booking.guest_name}</h3>
                      <p className="text-sm text-gray-600">{booking.meeting_types.name}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(booking.start_time).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        {booking.meeting_link && (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Video className="w-3 h-3" />
                            Visioconférence
                          </div>
                        )}
                        {booking.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="w-3 h-3" />
                            {booking.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={booking.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(booking.meeting_link, '_blank')}
                      disabled={!booking.meeting_link}
                      className="p-2 hover:bg-gray-200 rounded-lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Prochains rendez-vous</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: booking.meeting_types.color }}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{booking.guest_name}</h3>
                      <p className="text-sm text-gray-600">{booking.meeting_types.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(booking.start_time).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={booking.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <CalendarComponent
          bookings={bookings}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onBookingClick={handleBookingClick}
        />
      )}

      {/* Empty State */}
      {bookings.length === 0 && (
        <Card className="border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rendez-vous</h3>
            <p className="text-gray-600 mb-4">
              Commencez par créer vos types de rendez-vous et partagez votre lien de réservation.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/dashboard/bookings/meeting-types">
                <Button variant="outline" className="px-3 py-2.5 border-gray-200 hover:bg-gray-50">
                  Créer un type de RDV
                </Button>
              </Link>
              <Link href="/dashboard/bookings/settings">
                <Button className="px-3 py-2.5 bg-blue-600 text-white hover:bg-blue-700">
                  Paramètres du calendrier
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedBooking(null);
        }}
        onEdit={handleEditBooking}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteBooking}
      />
    </div>
  );
} 