"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Notification, NotificationFilters, NotificationSort, NotificationType, NotificationPriority } from '@/types/notification';
import { toast } from 'sonner';
import { useRealtimeNotifications } from '@/lib/notification-realtime';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  filters: NotificationFilters;
  sort: NotificationSort;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  setFilters: (filters: NotificationFilters) => void;
  setSort: (sort: NotificationSort) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Default fallback values for when context is not available
const defaultNotificationContext: NotificationContextType = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  filters: {},
  sort: { field: 'createdAt', direction: 'desc' },
  isPanelOpen: false,
  setIsPanelOpen: () => {},
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  setFilters: () => {},
  setSort: () => {},
  addNotification: () => {},
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [sort, setSort] = useState<NotificationSort>({ field: 'createdAt', direction: 'desc' });
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
    [notifications]
  );

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      
      // Convert date strings to Date objects
      const notificationsWithDates = data.map((notification: any) => ({
        ...notification,
        id: notification.id,
        userId: notification.user_id,
        createdAt: new Date(notification.created_at),
        expiresAt: notification.expires_at ? new Date(notification.expires_at) : undefined,
        isRead: notification.is_read,
        actionUrl: notification.action_url,
        actionLabel: notification.action_label,
      }));
      
      setNotifications(notificationsWithDates);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to mark all notifications as read');

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Toast is now handled by the realtime hook, no need to duplicate here
  };

  // Filter and sort notifications (memoized for better performance)
  const getFilteredAndSortedNotifications = useMemo(() => {
    let filtered = notifications;

    if (filters.type?.length) {
      filtered = filtered.filter(n => filters.type!.includes(n.type));
    }

    if (filters.priority?.length) {
      filtered = filtered.filter(n => filters.priority!.includes(n.priority));
    }

    if (filters.isRead !== undefined) {
      filtered = filtered.filter(n => n.isRead === filters.isRead);
    }

    if (filters.dateRange) {
      filtered = filtered.filter(n => {
        const createdAt = new Date(n.createdAt);
        return createdAt >= filters.dateRange!.start && createdAt <= filters.dateRange!.end;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sort.field) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'priority':
          const priorityOrder = {
            [NotificationPriority.LOW]: 1,
            [NotificationPriority.MEDIUM]: 2,
            [NotificationPriority.HIGH]: 3,
            [NotificationPriority.URGENT]: 4,
          };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          return 0;
      }

      if (sort.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [notifications, filters, sort]);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Set up real-time notifications
  useRealtimeNotifications();

  const value: NotificationContextType = {
    notifications: getFilteredAndSortedNotifications,
    unreadCount,
    isLoading,
    filters,
    sort,
    isPanelOpen,
    setIsPanelOpen,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    setFilters,
    setSort,
    addNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  return context || defaultNotificationContext;
}
