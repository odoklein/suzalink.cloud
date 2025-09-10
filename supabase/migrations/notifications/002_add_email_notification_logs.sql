-- Add email notification logs table
-- This table tracks email notifications sent to users

CREATE TABLE IF NOT EXISTS public.notification_email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_email_logs_notification_id ON public.notification_email_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_email_logs_user_email ON public.notification_email_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_notification_email_logs_status ON public.notification_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_email_logs_sent_at ON public.notification_email_logs(sent_at DESC);


-- Function to clean up old email notification logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_email_notification_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notification_email_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Add notification preferences table (optional - for future use)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  browser_notifications BOOLEAN DEFAULT true,
  urgent_only BOOLEAN DEFAULT false, -- Only send urgent notifications
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);



-- Function to update notification preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notification preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Insert default preferences for existing users
INSERT INTO public.notification_preferences (user_id, email_notifications, browser_notifications, urgent_only)
SELECT
  id,
  true,
  true,
  false
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences WHERE user_id = auth.users.id
)
AND auth.users.email IS NOT NULL;

-- Create indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
