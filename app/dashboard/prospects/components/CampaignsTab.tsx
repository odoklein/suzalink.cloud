"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mail,
  Send,
  Users,
  Eye,
  MousePointer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  MoreHorizontal,
  Search,
  Filter,
  BarChart3,
  Target,
  Edit,
  Copy,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateCampaignModal } from '../../emails/campaigns/components/CreateCampaignModal';
import { useRouter } from 'next/navigation';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  created_at: string;
  sent_at?: string;
  scheduled_at?: string;
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

interface OverallStats {
  totalCampaigns: number;
  activeCampaigns: number;
  sentCampaigns: number;
  draftCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  overallDeliveryRate: string;
  overallOpenRate: string;
  overallClickRate: string;
  overallBounceRate: string;
}

export function CampaignsTab() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCampaignData();
  }, []);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/emails/campaigns/stats');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
        setOverallStats(data.overallStats);
      } else {
        toast.error('Failed to load campaign data');
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Error loading campaigns');
    } finally {
      setLoading(false);
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
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Loading campaigns...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Campaigns</h2>
          <p className="text-gray-600">Manage and track your email marketing campaigns</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Mail className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Overall Statistics */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalCampaigns}</div>
              <p className="text-xs text-muted-foreground">
                {overallStats.activeCampaigns} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalRecipients.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {overallStats.totalDelivered.toLocaleString()} delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.overallOpenRate}%</div>
              <p className="text-xs text-muted-foreground">
                {overallStats.totalOpened.toLocaleString()} opens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.overallClickRate}%</div>
              <p className="text-xs text-muted-foreground">
                {overallStats.totalClicked.toLocaleString()} clicks
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campaigns</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    {statusFilter === 'all' ? 'All Status' : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('draft')}>
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('scheduled')}>
                    Scheduled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('sending')}>
                    Sending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('sent')}>
                    Sent
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first email campaign.'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Create Your First Campaign
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      <Badge className={getStatusColor(campaign.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(campaign.status)}
                          {campaign.status}
                        </div>
                      </Badge>
                    </div>
                    {campaign.description && (
                      <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {campaign.total_recipients} recipients
                      </div>
                      <div className="flex items-center gap-1">
                        <Send className="w-4 h-4" />
                        {campaign.sent_count} sent
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {campaign.opened_count} opens
                      </div>
                      <div className="flex items-center gap-1">
                        <MousePointer className="w-4 h-4" />
                        {campaign.clicked_count} clicks
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {campaign.sent_at ? formatDate(campaign.sent_at) : formatDate(campaign.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/emails/campaigns/${campaign.id}`)}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/emails/campaigns/${campaign.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Campaign
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCampaignCreated={loadCampaignData}
      />
    </div>
  );
}

