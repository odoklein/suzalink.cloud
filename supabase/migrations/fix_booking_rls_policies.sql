-- Fix RLS policies for booking system to allow API access
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can manage their own calendar settings" ON user_calendar_settings;
DROP POLICY IF EXISTS "Users can manage their own meeting types" ON meeting_types;
DROP POLICY IF EXISTS "Users can manage their own unavailable times" ON user_unavailable_times;
DROP POLICY IF EXISTS "Users can view bookings they host" ON bookings;
DROP POLICY IF EXISTS "Users can manage bookings they host" ON bookings;
DROP POLICY IF EXISTS "Guests can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can manage questions for their meeting types" ON booking_questions;
DROP POLICY IF EXISTS "Users can view answers for their bookings" ON booking_answers;
DROP POLICY IF EXISTS "Users can view notifications for their bookings" ON booking_notifications;

-- Create new policies that allow authenticated users to access all booking data
CREATE POLICY "Allow authenticated users to manage calendar settings" ON user_calendar_settings
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage meeting types" ON meeting_types
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage unavailable times" ON user_unavailable_times
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage bookings" ON bookings
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage booking questions" ON booking_questions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage booking answers" ON booking_answers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage booking notifications" ON booking_notifications
  FOR ALL USING (auth.role() = 'authenticated'); 