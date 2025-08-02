"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Video, 
  FileText,
  X,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from "lucide-react";

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

interface BookingDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (booking: Booking) => void;
  onCancel?: (bookingId: string) => void;
  onDelete?: (bookingId: string) => void;
  onStatusChange?: (bookingId: string, status: Booking['status']) => void;
}

export default function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  onEdit,
  onCancel,
  onDelete,
  onStatusChange
}: BookingDetailsModalProps) {
  if (!booking) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      case 'completed':
        return 'Terminé';
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Détails de la réservation
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: booking.meeting_types.color }}
              />
              <h3 className="text-lg font-semibold text-gray-900">
                {booking.meeting_types.name}
              </h3>
            </div>
            <Badge className={`${getStatusColor(booking.status)}`}>
              {getStatusText(booking.status)}
            </Badge>
          </div>

          {/* Guest Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Informations client</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{booking.guest_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">{booking.guest_email}</span>
              </div>
              {booking.guest_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{booking.guest_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{formatDate(booking.start_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </span>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700">
              Durée: {booking.meeting_types.duration_minutes} minutes
            </span>
          </div>

          {/* Meeting Details */}
          {(booking.meeting_link || booking.location) && (
            <div className="space-y-2">
              {booking.meeting_link && (
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-gray-500" />
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    {booking.meeting_link}
                  </span>
                </div>
              )}
              {booking.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{booking.location}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">Notes</span>
              </div>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                {booking.notes}
              </p>
            </div>
          )}

          {/* Linked Client/Prospect */}
          {(booking.clients || booking.prospects) && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {booking.clients ? 'Client lié' : 'Prospect lié'}
              </h4>
              <div className="space-y-1">
                <div className="font-medium text-gray-900">
                  {booking.clients?.name || booking.prospects?.name}
                </div>
                <div className="text-gray-600">
                  {booking.clients?.contact_email || booking.prospects?.email}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(booking)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(booking.id)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {booking.status === 'pending' && onStatusChange && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(booking.id, 'confirmed')}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(booking.id, 'cancelled')}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    Annuler
                  </Button>
                </>
              )}
              
              {booking.status === 'confirmed' && onStatusChange && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(booking.id, 'completed')}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marquer comme terminé
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 