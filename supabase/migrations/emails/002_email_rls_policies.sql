-- =====================================================
-- EMAIL SYSTEM ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all email tables
ALTER TABLE public.user_email_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PERSONAL EMAIL POLICIES
-- =====================================================

-- User Email Configs
CREATE POLICY "Users can manage their own email configs"
ON public.user_email_configs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Email Folders
CREATE POLICY "Users can manage their own email folders"
ON public.email_folders FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Personal Emails
CREATE POLICY "Users can manage their own personal emails"
ON public.personal_emails FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Email Attachments
CREATE POLICY "Users can manage attachments for their emails"
ON public.email_attachments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.personal_emails
    WHERE id = email_attachments.email_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.personal_emails
    WHERE id = email_attachments.email_id
    AND user_id = auth.uid()
  )
);

-- Email Labels
CREATE POLICY "Users can manage their own email labels"
ON public.email_labels FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Email Label Assignments
CREATE POLICY "Users can manage label assignments for their emails"
ON public.email_label_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.personal_emails
    WHERE id = email_label_assignments.email_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.personal_emails
    WHERE id = email_label_assignments.email_id
    AND user_id = auth.uid()
  )
);

-- =====================================================
-- EMAIL CAMPAIGN POLICIES
-- =====================================================

-- Email Templates
CREATE POLICY "Users can manage their own email templates"
ON public.email_templates FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Email Campaigns
CREATE POLICY "Users can manage their own email campaigns"
ON public.email_campaigns FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Campaign Recipients
CREATE POLICY "Users can manage recipients for their campaigns"
ON public.campaign_recipients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.email_campaigns
    WHERE id = campaign_recipients.campaign_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.email_campaigns
    WHERE id = campaign_recipients.campaign_id
    AND user_id = auth.uid()
  )
);

-- Email Sends
CREATE POLICY "Users can view sends for their campaigns"
ON public.email_sends FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.email_campaigns
    WHERE id = email_sends.campaign_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "System can manage email sends"
ON public.email_sends FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Email Tracking Events
CREATE POLICY "Users can view tracking events for their campaigns"
ON public.email_tracking_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.email_sends es
    JOIN public.email_campaigns ec ON es.campaign_id = ec.id
    WHERE es.id = email_tracking_events.send_id
    AND ec.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage tracking events"
ON public.email_tracking_events FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Campaign Analytics
CREATE POLICY "Users can view analytics for their campaigns"
ON public.campaign_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.email_campaigns
    WHERE id = campaign_analytics.campaign_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "System can manage campaign analytics"
ON public.campaign_analytics FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Email Unsubscribes (Global)
CREATE POLICY "Users can view unsubscribes from their campaigns"
ON public.email_unsubscribes FOR SELECT
USING (
  campaign_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.email_campaigns
    WHERE id = email_unsubscribes.campaign_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "System can manage unsubscribes"
ON public.email_unsubscribes FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- PUBLIC POLICIES FOR TRACKING
-- =====================================================

-- Allow anonymous access for email tracking (opens, clicks)
-- These are secured by tracking_id validation in the API
CREATE POLICY "Allow anonymous email tracking"
ON public.email_tracking_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow anonymous unsubscribe access"
ON public.email_unsubscribes FOR INSERT
WITH CHECK (true);

-- =====================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =====================================================

-- Function to check if user owns a campaign
CREATE OR REPLACE FUNCTION auth.user_owns_campaign(campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.email_campaigns
    WHERE id = $1 AND user_id = auth.uid()
  );
END;
$$;

-- Function to check if user owns an email config
CREATE OR REPLACE FUNCTION auth.user_owns_email_config(email_config_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_email_configs
    WHERE id = $1 AND user_id = auth.uid()
  );
END;
$$;

