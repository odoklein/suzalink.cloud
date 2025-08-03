"use client";
import { useNextAuth } from "@/lib/nextauth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Shield, User, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function SessionStatus() {
  const { 
    session, 
    sessionDuration, 
    isSessionValid, 
    sessionExpiryTime, 
    refreshSession,
    logout 
  } = useNextAuth();

  if (!session?.user) return null;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getSessionStatusColor = () => {
    if (!isSessionValid) return "high";
    if (sessionExpiryTime) {
      const timeUntilExpiry = sessionExpiryTime.getTime() - new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;
      if (timeUntilExpiry < fiveMinutes) return "high";
      if (timeUntilExpiry < 15 * 60 * 1000) return "medium";
    }
    return "default";
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <div className="flex items-center gap-1">
        <Shield className="w-3 h-3" />
        <span>Session:</span>
        <Badge variant={getSessionStatusColor()} className="text-xs">
          {isSessionValid ? "Active" : "Expired"}
        </Badge>
      </div>
      
      {sessionDuration > 0 && (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{formatDuration(sessionDuration)}</span>
        </div>
      )}
      
      {sessionExpiryTime && (
        <div className="flex items-center gap-1">
          <span>Expire dans:</span>
          <span className="font-medium">
            {formatDistanceToNow(sessionExpiryTime, { 
              addSuffix: true, 
              locale: fr 
            })}
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshSession}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Actualiser
        </Button>
      </div>
    </div>
  );
}

export function SessionInfo() {
  const { session, user } = useNextAuth();

  if (!session?.user) return null;

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Informations de session</span>
        </div>
        <SessionStatus />
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Utilisateur:</span>
          <span className="font-medium">{user?.name || user?.email}</span>
        </div>
        <div className="flex justify-between">
          <span>Rôle:</span>
          <Badge className="text-xs border border-gray-300 bg-white text-gray-700">
            {user?.role}
          </Badge>
        </div>
        {user?.last_login && (
          <div className="flex justify-between">
            <span>Dernière connexion:</span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(user.last_login), { 
                addSuffix: true, 
                locale: fr 
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 