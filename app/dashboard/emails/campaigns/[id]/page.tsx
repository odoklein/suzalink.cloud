"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Mail,
  Send,
  Users,
  Eye,
  MousePointer,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Download,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Target,
  Calendar,
  User,
  AtSign,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  created_at: string;
  sent_at?: string;
  scheduled_at?: string;
  subject: string;
  sender_name?: string;
  sender_email: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  email_templates?: {
    id: string;
    name: string;
    subject: string;
  };
}

interface ProspectStatus {
  id: string;
  prospect_id: string;
  recipient_email: string;
  recipient_name?: string;
  send_status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  prospect_data?: {
    company?: string;
    position?: string;
    phone?: string;
  };
}

interface CampaignStats {
  campaign: Campaign;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  deliveryRate: string;
  openRate: string;
  clickRate: string;
  bounceRate: string;
  recipientStats: Record<string, number>;
  trackingStats: Record<string, number>;
  emailSends: number;
  prospects: ProspectStatus[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [prospects, setProspects] = useState<ProspectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);

      // Load campaign details and stats in parallel
      const [campaignResponse, statsResponse] = await Promise.all([
        fetch(`/api/emails/campaigns/${campaignId}`),
        fetch(`/api/emails/campaigns/stats?campaignId=${campaignId}`)
      ]);

      if (!campaignResponse.ok) {
        if (campaignResponse.status === 404) {
          throw new Error('Campaign not found');
        }
        throw new Error('Failed to load campaign');
      }

      const campaignData = await campaignResponse.json();
      setCampaign(campaignData.campaign);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
        setProspects(statsData.stats.prospects || []);
      }
    } catch (error) {
      console.error('Error loading campaign data:', error);
      toast.error('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCampaign = async () => {
    if (!campaign) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel this campaign? This action cannot be undone.'
    );

    if (!confirmed) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/emails/campaigns/${campaignId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel campaign');
      }

      toast.success('Campaign cancelled successfully');
      // Reload campaign data to update status
      await loadCampaignData();
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel campaign');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'sending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <AlertCircle className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'sending': return <Send className="w-4 h-4" />;
      case 'sent': return <CheckCircle2 className="w-4 h-4" />;
      case 'paused': return <AlertCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExport = async () => {
    if (!stats) return;

    setExporting(true);
    try {
      const csvData = [
        ['Name', 'Email', 'Status', 'Sent At', 'Delivered At', 'Opened At', 'Clicked At', 'Company', 'Position'],
        ...prospects.map(prospect => [
          prospect.recipient_name || '',
          prospect.recipient_email,
          prospect.send_status,
          prospect.sent_at ? formatDate(prospect.sent_at) : '',
          prospect.delivered_at ? formatDate(prospect.delivered_at) : '',
          prospect.opened_at ? formatDate(prospect.opened_at) : '',
          prospect.clicked_at ? formatDate(prospect.clicked_at) : '',
          prospect.prospect_data?.company || '',
          prospect.prospect_data?.position || ''
        ])
      ];

      const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `campaign_${campaign?.name || campaignId}_prospects.csv`;
      link.click();

      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch = prospect.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prospect.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prospect.prospect_data?.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prospect.send_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Campaign not found</h3>
          <p className="text-gray-500">The campaign you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-600">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(campaign.status)}>
            <div className="flex items-center gap-1">
              {getStatusIcon(campaign.status)}
              {campaign.status}
            </div>
          </Badge>
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelCampaign}
              disabled={cancelling}
            >
              <X className="w-4 h-4 mr-2" />
              {cancelling ? 'Cancelling...' : 'Cancel Campaign'}
            </Button>
          )}
        </div>
      </div>

      {/* Campaign Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRecipients || campaign.total_recipients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sentCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.deliveryRate}% delivered` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openedCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.openRate}% open rate` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicked</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clickedCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.clickRate}% click rate` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deliveredCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.deliveryRate}% delivery rate` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounced</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.bouncedCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? `${stats.bounceRate}% bounce rate` : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Subject</label>
              <p className="text-sm">{campaign.subject}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Sender</label>
              <p className="text-sm">
                {campaign.sender_name && `${campaign.sender_name} `}
                <span className="text-gray-500">&lt;{campaign.sender_email}&gt;</span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-sm">{formatDate(campaign.created_at)}</p>
            </div>
            {campaign.sent_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Sent At</label>
                <p className="text-sm">{formatDate(campaign.sent_at)}</p>
              </div>
            )}
            {campaign.scheduled_at && campaign.status === 'scheduled' && (
              <div>
                <label className="text-sm font-medium text-gray-500">Scheduled For</label>
                <p className="text-sm">{formatDate(campaign.scheduled_at)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prospect Status Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Prospect Status</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search prospects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {statusFilter === 'all' ? 'All Status' : statusFilter}
              </Button>
              <Button onClick={handleExport} disabled={exporting}>
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Delivered At</TableHead>
                  <TableHead>Opened At</TableHead>
                  <TableHead>Clicked At</TableHead>
                  <TableHead>Company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProspects.map((prospect) => (
                  <TableRow key={prospect.id}>
                    <TableCell className="font-medium">
                      {prospect.recipient_name || '—'}
                    </TableCell>
                    <TableCell>{prospect.recipient_email}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(prospect.send_status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(prospect.send_status)}
                          {prospect.send_status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {prospect.sent_at ? formatDate(prospect.sent_at) : '—'}
                    </TableCell>
                    <TableCell>
                      {prospect.delivered_at ? formatDate(prospect.delivered_at) : '—'}
                    </TableCell>
                    <TableCell>
                      {prospect.opened_at ? formatDate(prospect.opened_at) : '—'}
                    </TableCell>
                    <TableCell>
                      {prospect.clicked_at ? formatDate(prospect.clicked_at) : '—'}
                    </TableCell>
                    <TableCell>
                      {prospect.prospect_data?.company || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredProspects.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No prospects found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No prospects have been added to this campaign yet.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
