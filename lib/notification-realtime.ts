"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNotifications } from '@/lib/notification-context';
import { toast } from 'sonner';

export function useRealtimeNotifications() {
  const { addNotification, fetchNotifications } = useNotifications();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    };

    const setupRealtimeSubscription = async () => {
      const userId = await getCurrentUser();
      if (!userId) return;

      // Clean up existing subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Create new realtime subscription
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('🎉 New notification received:', payload.new);

            // Convert database format to frontend format
            const newNotification = {
              id: payload.new.id,
              userId: payload.new.user_id,
              type: payload.new.type,
              title: payload.new.title,
              message: payload.new.message,
              data: payload.new.data,
              isRead: payload.new.is_read,
              priority: payload.new.priority,
              createdAt: new Date(payload.new.created_at),
              expiresAt: payload.new.expires_at ? new Date(payload.new.expires_at) : undefined,
              actionUrl: payload.new.action_url,
              actionLabel: payload.new.action_label,
            };

            // Add to context
            addNotification(newNotification);

            // Show toast notification
            toast(newNotification.title, {
              description: newNotification.message,
              duration: 5000,
              action: newNotification.actionUrl && newNotification.actionLabel ? {
                label: newNotification.actionLabel,
                onClick: () => window.location.href = newNotification.actionUrl!,
              } : undefined,
            });

            // Show browser notification if supported and permitted
            if (isNotificationSupported() && getNotificationPermission() === 'granted') {
              showBrowserNotification(newNotification.title, {
                body: newNotification.message,
                tag: `notification-${newNotification.id}`, // Prevent duplicate notifications
                priority: newNotification.priority,
                onClick: () => {
                  if (newNotification.actionUrl) {
                    window.location.href = newNotification.actionUrl;
                  } else {
                    window.focus();
                  }
                },
              });

              // Play notification sound for high/urgent priority
              if (newNotification.priority === 'high' || newNotification.priority === 'urgent') {
                playNotificationSound();
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('🔔 Notification realtime subscription status:', status);
        });

      channelRef.current = channel;
    };

    setupRealtimeSubscription();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [addNotification]);

  return null;
}

// Utility function to request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Utility function to show browser notification with enhanced features
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions & {
    onClick?: () => void;
    onClose?: () => void;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }
) {
  if (Notification.permission === 'granted') {
    const notificationOptions: NotificationOptions = {
      icon: '/iconlogo.svg',
      badge: '/iconlogo.svg',
      requireInteraction: options?.priority === 'urgent' || options?.priority === 'high',
      silent: options?.priority === 'low',
      ...options,
    };

    // Add vibration pattern for mobile devices
    if ('vibrate' in navigator && options?.priority === 'urgent') {
      notificationOptions.vibrate = [200, 100, 200, 100, 200];
    }

    const notification = new Notification(title, notificationOptions);

    // Handle click
    if (options?.onClick) {
      notification.onclick = () => {
        options.onClick!();
        notification.close();
      };
    } else {
      // Default behavior: focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Handle close
    if (options?.onClose) {
      notification.onclose = options.onClose;
    }

    // Auto-close after 10 seconds for non-urgent notifications
    if (options?.priority !== 'urgent' && options?.priority !== 'high') {
      setTimeout(() => {
        notification.close();
      }, 10000);
    }

    return notification;
  }

  return null;
}

// Check if browser notifications are supported
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

// Get current notification permission status
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

// Set up notification sound (optional)
export function playNotificationSound() {
  try {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore errors if sound can't be played
    });
  } catch (error) {
    // Ignore errors
  }
}

// Hook to handle notification permission and setup
export function useNotificationSetup() {
  useEffect(() => {
    // Request permission on mount
    requestNotificationPermission().then((granted) => {
      if (granted) {
        console.log('🔔 Browser notifications enabled');
      } else {
        console.log('🔕 Browser notifications denied or not supported');
      }
    });

    // Handle page visibility changes to show missed notifications
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear any pending notifications badge
        if ('setAppBadge' in navigator) {
          (navigator as any).setAppBadge();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
