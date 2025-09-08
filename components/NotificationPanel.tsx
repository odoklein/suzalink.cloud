"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  SortAsc,
  SortDesc,
  X,
  Clock,
  AlertTriangle,
  Info,
  AlertCircle,
  Calendar,
  User,
  Briefcase,
  Users,
} from 'lucide-react';
import { useNotifications } from '@/lib/notification-context';
import { Notification, NotificationType, NotificationPriority } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_DUE_SOON:
    case NotificationType.TASK_OVERDUE:
    case NotificationType.FORGOTTEN_TASK:
      return <Briefcase className="w-4 h-4" />;
    case NotificationType.PROJECT_ASSIGNED:
      return <Briefcase className="w-4 h-4" />;
    case NotificationType.PROSPECT_LIST_ASSIGNED:
    case NotificationType.PROSPECT_RAPPEL_DUE:
    case NotificationType.PROSPECT_RAPPEL_OVERDUE:
      return <Users className="w-4 h-4" />;
    case NotificationType.DEADLINE_APPROACHING:
    case NotificationType.DEADLINE_PASSED:
      return <Clock className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
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
      return <Info className="w-3 h-3" />;
    case NotificationPriority.MEDIUM:
      return <Info className="w-3 h-3" />;
    case NotificationPriority.HIGH:
      return <AlertTriangle className="w-3 h-3" />;
    case NotificationPriority.URGENT:
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <Info className="w-3 h-3" />;
  }
};

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    filters,
    sort,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setFilters,
    setSort,
  } = useNotifications();

  const [showFilters, setShowFilters] = useState(false);

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const handleTypeFilterChange = (type: NotificationType, checked: boolean) => {
    const currentTypes = filters.type || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);

    setFilters({ ...filters, type: newTypes.length > 0 ? newTypes : undefined });
  };

  const handlePriorityFilterChange = (priority: NotificationPriority, checked: boolean) => {
    const currentPriorities = filters.priority || [];
    const newPriorities = checked
      ? [...currentPriorities, priority]
      : currentPriorities.filter(p => p !== priority);

    setFilters({ ...filters, priority: newPriorities.length > 0 ? newPriorities : undefined });
  };

  const toggleSortDirection = () => {
    setSort({
      ...sort,
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
            </Button>

            <Select
              value={sort.field}
              onValueChange={(value: any) => setSort({ ...sort, field: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortDirection}
            >
              {sort.direction === 'desc' ? (
                <SortDesc className="w-4 h-4" />
              ) : (
                <SortAsc className="w-4 h-4" />
              )}
            </Button>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Type</h3>
                <div className="space-y-2">
                  {Object.values(NotificationType).map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={filters.type?.includes(type) || false}
                        onCheckedChange={(checked) =>
                          handleTypeFilterChange(type, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`type-${type}`}
                        className="text-sm text-gray-700 capitalize"
                      >
                        {type.replace(/_/g, ' ').toLowerCase()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Priority</h3>
                <div className="space-y-2">
                  {Object.values(NotificationPriority).map((priority) => (
                    <div key={priority} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${priority}`}
                        checked={filters.priority?.includes(priority) || false}
                        onCheckedChange={(checked) =>
                          handlePriorityFilterChange(priority, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`priority-${priority}`}
                        className="text-sm text-gray-700 capitalize"
                      >
                        {priority}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading notifications...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="w-12 h-12 text-gray-300 mb-4" />
              <div className="text-sm text-gray-500 text-center">
                No notifications yet
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
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
                          <span className="ml-1 capitalize">{notification.priority}</span>
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>

                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {notification.title}
                      </h3>

                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>

                      {notification.actionUrl && notification.actionLabel && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => window.location.href = notification.actionUrl!}
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
                          className="h-7 w-7 p-0"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(notification.id)}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
      </div>
    </div>
  );
}
