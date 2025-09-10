import { useState, useEffect, useCallback } from 'react';

interface UserPresence {
  id: string;
  full_name: string;
  email: string;
  profile_picture_url?: string;
  is_online: boolean;
  last_seen?: string;
}

export function usePresence() {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPresence = useCallback(async () => {
    try {
      const response = await fetch('/api/messagerie/presence');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching presence:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePresence = useCallback(async () => {
    try {
      await fetch('/api/messagerie/presence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, []);

  useEffect(() => {
    fetchPresence();

    // Update presence every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // Update presence on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePresence();
        fetchPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPresence, updatePresence]);

  const getOnlineUsers = useCallback(() => {
    return users.filter(user => user.is_online);
  }, [users]);

  const getUserPresence = useCallback((userId: string) => {
    return users.find(user => user.id === userId);
  }, [users]);

  return {
    users,
    onlineUsers: getOnlineUsers(),
    getUserPresence,
    loading,
    refreshPresence: fetchPresence
  };
}
