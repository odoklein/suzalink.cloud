"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mail, Clock, CheckCircle2, AlertCircle, Eye, MousePointer } from 'lucide-react';

interface EmailActivity {
  id: string;
  activity_type: string;
  description: string;
  metadata: {
    subject?: string;
    recipient_email?: string;
    message_id?: string;
    email_config_id?: string;
    status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    opened_at?: string;
    clicked_at?: string;
    delivered_at?: string;
    bounced_at?: string;
    tracking_id?: string;
  };
  created_at: string;
  updated_at?: string;
}

interface Prospect {
  id: string;
  data: {
    name: string;
    email?: string;
  };
}

interface EmailHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
}

export function EmailHistoryModal({
  isOpen,
  onClose,
  prospect
}: EmailHistoryModalProps) {
  const [emailActivities, setEmailActivities] = useState<EmailActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && prospect) {
      fetchEmailHistory();
    }
  }, [isOpen, prospect]);

  const fetchEmailHistory = async () => {
    if (!prospect) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/activities?type=email`);
      const data = await res.json();

      if (data.activities) {
        setEmailActivities(data.activities);
      }
    } catch (error) {
      console.error('Error fetching email history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'opened': return <Eye className="h-4 w-4 text-purple-600" />;
      case 'clicked': return <MousePointer className="h-4 w-4 text-orange-600" />;
      case 'bounced': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-blue-100 text-blue-800';
      case 'opened': return 'bg-purple-100 text-purple-800';
      case 'clicked': return 'bg-orange-100 text-orange-800';
      case 'bounced': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!prospect) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email History - {prospect.data.name}
          </DialogTitle>
          <DialogDescription>
            Complete email communication history and tracking information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading email history...</span>
            </div>
          ) : emailActivities.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No email history found for this prospect</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emailActivities.map((activity) => (
                <Card key={activity.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(activity.metadata?.status)}
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {activity.metadata?.subject || 'Email sent'}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(activity.metadata?.status)}>
                              {activity.metadata?.status || 'sent'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDateTime(activity.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedEmail(
                          expandedEmail === activity.id ? null : activity.id
                        )}
                      >
                        {expandedEmail === activity.id ? 'Collapse' : 'Details'}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        To: {activity.metadata?.recipient_email || 'Unknown recipient'}
                      </div>
                      <div className="text-sm">{activity.description}</div>

                      {activity.metadata?.message_id && (
                        <div className="text-xs text-muted-foreground">
                          Message ID: {activity.metadata.message_id}
                        </div>
                      )}

                      {expandedEmail === activity.id && (
                        <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                          <h4 className="font-medium text-sm">Tracking Details</h4>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Sent:</span>
                              <div className="text-muted-foreground">
                                {formatDateTime(activity.created_at)}
                              </div>
                            </div>

                            {activity.metadata?.delivered_at && (
                              <div>
                                <span className="font-medium">Delivered:</span>
                                <div className="text-muted-foreground">
                                  {formatDateTime(activity.metadata.delivered_at)}
                                </div>
                              </div>
                            )}

                            {activity.metadata?.opened_at && (
                              <div>
                                <span className="font-medium">Opened:</span>
                                <div className="text-muted-foreground">
                                  {formatDateTime(activity.metadata.opened_at)}
                                </div>
                              </div>
                            )}

                            {activity.metadata?.clicked_at && (
                              <div>
                                <span className="font-medium">Clicked:</span>
                                <div className="text-muted-foreground">
                                  {formatDateTime(activity.metadata.clicked_at)}
                                </div>
                              </div>
                            )}

                            {activity.metadata?.bounced_at && (
                              <div>
                                <span className="font-medium">Bounced:</span>
                                <div className="text-muted-foreground">
                                  {formatDateTime(activity.metadata.bounced_at)}
                                </div>
                              </div>
                            )}
                          </div>

                          {activity.metadata?.tracking_id && (
                            <div className="text-xs text-muted-foreground">
                              Tracking ID: {activity.metadata.tracking_id}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={fetchEmailHistory} disabled={loading}>
            Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
