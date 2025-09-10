"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Settings, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  requestNotificationPermission,
  isNotificationSupported,
  getNotificationPermission,
  showBrowserNotification
} from '@/lib/notification-realtime';

interface NotificationPermissionProps {
  compact?: boolean;
  showSettings?: boolean;
}

export function NotificationPermission({ compact = false, showSettings = true }: NotificationPermissionProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      setPermission(getNotificationPermission());

      if (granted) {
        toast.success('Notifications activées!', {
          description: 'Vous recevrez désormais des notifications en temps réel.'
        });

        // Show a test notification
        showBrowserNotification('Notifications activées', {
          body: 'Vous recevrez désormais des notifications pour les événements importants.',
          priority: 'medium',
        });
      } else {
        toast.error('Permission refusée', {
          description: 'Les notifications ont été refusées. Vous pouvez les activer dans les paramètres de votre navigateur.'
        });
      }
    } catch (error) {
      toast.error('Erreur', {
        description: 'Impossible de demander la permission de notification.'
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = () => {
    showBrowserNotification('Test de notification', {
      body: 'Ceci est une notification de test pour vérifier que tout fonctionne correctement.',
      priority: 'medium',
    });
    toast.success('Notification de test envoyée');
  };

  const getPermissionStatus = () => {
    if (!isSupported) {
      return {
        status: 'unsupported',
        label: 'Non supporté',
        description: 'Votre navigateur ne prend pas en charge les notifications.',
        icon: BellOff,
        color: 'bg-gray-100 text-gray-700'
      };
    }

    switch (permission) {
      case 'granted':
        return {
          status: 'granted',
          label: 'Activées',
          description: 'Vous recevez des notifications en temps réel.',
          icon: Bell,
          color: 'bg-green-100 text-green-700'
        };
      case 'denied':
        return {
          status: 'denied',
          label: 'Refusées',
          description: 'Les notifications sont bloquées. Activez-les dans les paramètres de votre navigateur.',
          icon: BellOff,
          color: 'bg-red-100 text-red-700'
        };
      default:
        return {
          status: 'default',
          label: 'Non demandées',
          description: 'Cliquez pour activer les notifications.',
          icon: Settings,
          color: 'bg-yellow-100 text-yellow-700'
        };
    }
  };

  const status = getPermissionStatus();
  const StatusIcon = status.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={status.color}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
        {permission === 'default' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestPermission}
            disabled={isRequesting}
          >
            {isRequesting ? 'Demande...' : 'Activer'}
          </Button>
        )}
        {permission === 'granted' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
          >
            Tester
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications du navigateur
        </CardTitle>
        <CardDescription>
          Recevez des notifications en temps réel pour les événements importants directement dans votre navigateur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <StatusIcon className="w-5 h-5" />
            <div>
              <div className="font-medium">Statut: {status.label}</div>
              <div className="text-sm text-gray-600">{status.description}</div>
            </div>
          </div>
          <Badge variant="outline" className={status.color}>
            {permission}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {permission === 'default' && (
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="flex-1"
            >
              {isRequesting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Demande en cours...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Activer les notifications
                </>
              )}
            </Button>
          )}

          {permission === 'granted' && (
            <>
              <Button
                variant="outline"
                onClick={handleTestNotification}
                className="flex-1"
              >
                <Bell className="w-4 h-4 mr-2" />
                Tester les notifications
              </Button>
            </>
          )}

          {permission === 'denied' && (
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Paramètres du navigateur', {
                  description: 'Ouvrez les paramètres de votre navigateur pour activer les notifications.',
                  duration: 5000,
                });
              }}
              className="flex-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              Ouvrir les paramètres
            </Button>
          )}
        </div>

        {/* Features */}
        {showSettings && permission === 'granted' && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Fonctionnalités activées:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Notifications en temps réel pour les nouveaux événements
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Sons pour les notifications prioritaires
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Vibrations sur mobile pour les urgences
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3 text-green-500" />
                Clic pour accéder directement aux détails
              </li>
            </ul>
          </div>
        )}

        {/* Help */}
        {!isSupported && (
          <div className="border-t pt-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Settings className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-blue-900">Navigateur non compatible</div>
                <div className="text-blue-700">
                  Utilisez un navigateur moderne comme Chrome, Firefox, Edge ou Safari pour bénéficier des notifications.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

