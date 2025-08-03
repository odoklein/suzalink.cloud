"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface SuzaiContext {
  currentPage: string;
  currentData: any;
  availableActions: string[];
  isWidgetOpen: boolean;
  setIsWidgetOpen: (open: boolean) => void;
  executeAction: (action: string, params: any) => Promise<void>;
  sendMessage: (message: string) => Promise<{ response: string; actions: string[]; }>;
}

const SuzaiContext = createContext<SuzaiContext | undefined>(undefined);

interface SuzaiProviderProps {
  children: ReactNode;
}

export function SuzaiProvider({ children }: SuzaiProviderProps) {
  const pathname = usePathname();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentData, setCurrentData] = useState(null);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  // Update context based on current page
  useEffect(() => {
    const page = pathname.split('/').pop() || 'dashboard';
    setCurrentPage(page);

    // Set available actions based on current page
    const actions = getAvailableActionsForPage(page);
    setAvailableActions(actions);
  }, [pathname]);

  const getAvailableActionsForPage = (page: string): string[] => {
    const actionMap: Record<string, string[]> = {
      'email': ['send_email', 'reply', 'forward', 'delete', 'mark_read', 'search_emails'],
      'bookings': ['create_booking', 'reschedule', 'cancel', 'view_calendar', 'check_availability'],
      'clients': ['create_client', 'update_client', 'find_client', 'send_email_to_client'],
      'prospects': ['import_prospects', 'assign_prospects', 'create_list', 'export_data'],
      'finance': ['generate_invoice', 'send_invoice', 'track_payments', 'view_reports'],
      'projects': ['create_project', 'update_status', 'assign_tasks', 'view_progress'],
      'dashboard': ['overview', 'quick_actions', 'recent_activity', 'notifications']
    };

    return actionMap[page] || ['general_help'];
  };

  const executeAction = async (action: string, params: any) => {
    try {
      console.log(`SUZai executing action: ${action}`, params);
      
      // Simulate action execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would implement actual action logic
      switch (action) {
        case 'send_email':
          // Call email API
          break;
        case 'create_booking':
          // Call booking API
          break;
        case 'generate_invoice':
          // Call invoice API
          break;
        default:
          console.log(`Action ${action} not implemented yet`);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      throw error;
    }
  };

  const sendMessage = async (message: string) => {
    try {
      console.log('SUZai received message:', message);
      
      // Here you would implement actual AI processing
      // For now, just log the message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        response: `J'ai reçu votre message : "${message}". Je travaille sur votre demande...`,
        actions: availableActions
      };
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  };

  const value: SuzaiContext = {
    currentPage,
    currentData,
    availableActions,
    isWidgetOpen,
    setIsWidgetOpen,
    executeAction,
    sendMessage
  };

  return (
    <SuzaiContext.Provider value={value}>
      {children}
    </SuzaiContext.Provider>
  );
}

export function useSuzai() {
  const context = useContext(SuzaiContext);
  if (context === undefined) {
    throw new Error('useSuzai must be used within a SuzaiProvider');
  }
  return context;
} 