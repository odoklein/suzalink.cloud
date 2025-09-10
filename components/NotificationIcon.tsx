"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  AlertTriangle,
  Info,
  AlertCircle,
  Briefcase,
  Users,
  X,
} from 'lucide-react';
import { useNotifications } from '@/lib/notification-context';
import { Notification, NotificationType, NotificationPriority } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NotificationPermission } from '@/components/NotificationPermission';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_DUE_SOON:
    case NotificationType.TASK_OVERDUE:
    case NotificationType.TASK_STATUS_CHANGED:
    case NotificationType.FORGOTTEN_TASK:
      return <Briefcase className="w-3 h-3" />;
    case NotificationType.PROJECT_ASSIGNED:
      return <Briefcase className="w-3 h-3" />;
    case NotificationType.PROSPECT_LIST_ASSIGNED:
    case NotificationType.PROSPECT_LIST_USER_ASSIGNED:
    case NotificationType.PROSPECT_RAPPEL_DUE:
    case NotificationType.PROSPECT_RAPPEL_OVERDUE:
      return <Users className="w-3 h-3" />;
    case NotificationType.DEADLINE_APPROACHING:
    case NotificationType.DEADLINE_PASSED:
      return <Clock className="w-3 h-3" />;
    default:
      return <Bell className="w-3 h-3" />;
  }
};

const getPriorityColor = (priority: NotificationPriority) => {
  switch (priority) {
    case NotificationPriority.LOW:
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case NotificationPriority.MEDIUM:
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case NotificationPriority.HIGH:
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case NotificationPriority.URGENT:
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getPriorityIcon = (priority: NotificationPriority) => {
  switch (priority) {
    case NotificationPriority.LOW:
      return <Info className="w-2 h-2" />;
    case NotificationPriority.MEDIUM:
      return <Info className="w-2 h-2" />;
    case NotificationPriority.HIGH:
      return <AlertTriangle className="w-2 h-2" />;
    case NotificationPriority.URGENT:
      return <AlertCircle className="w-2 h-2" />;
    default:
      return <Info className="w-2 h-2" />;
  }
};

interface NotificationIconProps {
  compact?: boolean;
  className?: string;
  inSidebar?: boolean;
  collapsed?: boolean;
}

export function NotificationIcon({ compact = false, className = "", inSidebar = false, collapsed = false }: NotificationIconProps = {}) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleActionClick = (actionUrl: string) => {
    setIsOpen(false); // Close dropdown first
    router.push(actionUrl);
  };

  // Get recent notifications (last 10) - memoized for performance
  const recentNotifications = useMemo(() => 
    notifications.slice(0, 10), 
    [notifications]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Icon Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 ${inSidebar ? 'h-6 w-6' : 'h-8 w-8'} ${inSidebar ? 'hover:bg-gray-200' : 'hover:bg-gray-100'} ${className}`}
        title={collapsed ? 'Notifications' : undefined}
      >
        <Bell className={`text-gray-600 ${inSidebar ? 'w-3 h-3' : 'w-4 h-4'}`} />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className={`absolute -top-1 -right-1 flex items-center justify-center p-0 text-xs ${
              inSidebar ? 'h-4 w-4 text-[10px]' : 'h-5 w-5'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute bg-white border border-gray-200 rounded-lg shadow-lg z-50 ${
          inSidebar
            ? collapsed
              ? 'left-full top-0 ml-1 w-64' // Compact dropdown for collapsed sidebar
              : 'left-full top-0 ml-2 w-72' // Normal sidebar dropdown
            : 'left-0 top-full mt-2 w-80' // Normal position
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b border-gray-200 ${
            inSidebar && collapsed ? 'p-2' : 'p-3'
          }`}>
            <h3 className={`font-semibold text-gray-900 ${
              inSidebar && collapsed ? 'text-xs' : 'text-sm'
            }`}>
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-6 px-2 text-xs"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Tout marquer
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <ScrollArea className={inSidebar ? 'max-h-80' : 'max-h-96'}>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className={`text-gray-500 ${
                  inSidebar && collapsed ? 'text-xs' : 'text-sm'
                }`}>
                  {inSidebar && collapsed ? 'Chargement...' : 'Chargement...'}
                </div>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className={`flex flex-col items-center justify-center px-4 ${
                inSidebar && collapsed ? 'py-4' : 'py-6'
              }`}>
                <Bell className={`text-gray-300 mb-2 ${
                  inSidebar && collapsed ? 'w-6 h-6' : 'w-8 h-8'
                }`} />
                <div className={`text-gray-500 text-center ${
                  inSidebar && collapsed ? 'text-xs' : 'text-sm'
                }`}>
                  {inSidebar && collapsed ? 'Aucune notif' : 'Aucune notification'}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${inSidebar && collapsed ? 'p-2' : 'p-3'} hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(notification.priority)}`}
                          >
                            {getPriorityIcon(notification.priority)}
                            <span className="ml-1 capitalize text-xs">
                              {notification.priority}
                            </span>
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {(() => {
                              try {
                                const date = new Date(notification.createdAt);
                                if (isNaN(date.getTime())) {
                                  return 'Date invalide';
                                }
                                return formatDistanceToNow(date, {
                                  addSuffix: true,
                                  locale: fr,
                                });
                              } catch (error) {
                                return 'Date invalide';
                              }
                            })()}
                          </span>
                        </div>

                        <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-1">
                          {notification.title}
                        </h4>

                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>

                        {notification.actionUrl && notification.actionLabel && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => handleActionClick(notification.actionUrl!)}
                          >
                            {notification.actionLabel}
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className={`${inSidebar && collapsed ? 'p-2' : 'p-3'} border-t border-gray-200 bg-gray-50 space-y-2`}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full ${inSidebar && collapsed ? 'text-[10px] h-6' : 'text-xs'}`}
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard');
                }}
              >
                {inSidebar && collapsed ? 'Voir tout' : 'Voir toutes les notifications'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${
                  inSidebar && collapsed ? 'text-[10px] h-6' : 'text-xs'
                }`}
                onClick={() => {
                  setIsOpen(false);
                  // You could open a modal here for notification settings
                  console.log('Open notification settings');
                }}
              >
                {inSidebar && collapsed ? 'Paramètres' : 'Paramètres des notifications'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
