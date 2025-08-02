-- Migration: Add booking system tables for Calendly-like functionality

-- 1. User Availability/Calendar Settings
CREATE TABLE IF NOT EXISTS user_calendar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text DEFAULT 'Europe/Paris',
  working_hours jsonb DEFAULT '{"monday": {"start": "09:00", "end": "17:00"}, "tuesday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "thursday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "17:00"}}',
  break_time_minutes integer DEFAULT 60,
  slot_duration_minutes integer DEFAULT 30,
  advance_booking_days integer DEFAULT 30,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Meeting Types/Services
CREATE TABLE IF NOT EXISTS meeting_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  price decimal(10,2),
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. User Unavailable Times (Vacations, Sick days, etc.)
CREATE TABLE IF NOT EXISTS user_unavailable_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  is_all_day boolean DEFAULT false,
  reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Bookings/Appointments
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type_id uuid REFERENCES meeting_types(id) ON DELETE CASCADE,
  host_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status text DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  meeting_link text, -- For video calls
  location text, -- For in-person meetings
  client_id uuid REFERENCES clients(id), -- Link to existing client if applicable
  prospect_id uuid REFERENCES prospects(id), -- Link to existing prospect if applicable
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Booking Questions (Custom fields for each meeting type)
CREATE TABLE IF NOT EXISTS booking_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type_id uuid REFERENCES meeting_types(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text DEFAULT 'text' CHECK (question_type IN ('text', 'textarea', 'select', 'checkbox')),
  is_required boolean DEFAULT false,
  options jsonb, -- For select/checkbox questions
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Booking Answers
CREATE TABLE IF NOT EXISTS booking_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  question_id uuid REFERENCES booking_questions(id) ON DELETE CASCADE,
  answer text,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Booking Notifications
CREATE TABLE IF NOT EXISTS booking_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('confirmation', 'reminder', 'cancellation')),
  sent_to text NOT NULL, -- 'host' or 'guest'
  sent_at timestamp with time zone DEFAULT now(),
  email_sent boolean DEFAULT false,
  sms_sent boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE user_calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unavailable_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for user_calendar_settings
CREATE POLICY "Users can manage their own calendar settings" ON user_calendar_settings
  FOR ALL USING (auth.uid() = user_id);

-- Policies for meeting_types
CREATE POLICY "Users can manage their own meeting types" ON meeting_types
  FOR ALL USING (auth.uid() = user_id);

-- Policies for user_unavailable_times
CREATE POLICY "Users can manage their own unavailable times" ON user_unavailable_times
  FOR ALL USING (auth.uid() = user_id);

-- Policies for bookings
CREATE POLICY "Users can view bookings they host" ON bookings
  FOR SELECT USING (auth.uid() = host_user_id);

CREATE POLICY "Users can manage bookings they host" ON bookings
  FOR ALL USING (auth.uid() = host_user_id);

-- Allow guests to view their own bookings (by email)
CREATE POLICY "Guests can view their own bookings" ON bookings
  FOR SELECT USING (guest_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policies for booking_questions
CREATE POLICY "Users can manage questions for their meeting types" ON booking_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM meeting_types 
      WHERE meeting_types.id = booking_questions.meeting_type_id 
      AND meeting_types.user_id = auth.uid()
    )
  );

-- Policies for booking_answers
CREATE POLICY "Users can view answers for their bookings" ON booking_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_answers.booking_id 
      AND bookings.host_user_id = auth.uid()
    )
  );

-- Policies for booking_notifications
CREATE POLICY "Users can view notifications for their bookings" ON booking_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_notifications.booking_id 
      AND bookings.host_user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX idx_bookings_host_user_id ON bookings(host_user_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_guest_email ON bookings(guest_email);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_prospect_id ON bookings(prospect_id);
CREATE INDEX idx_meeting_types_user_id ON meeting_types(user_id);
CREATE INDEX idx_user_unavailable_times_user_id ON user_unavailable_times(user_id);
CREATE INDEX idx_user_unavailable_times_start_time ON user_unavailable_times(start_time);

-- Comments
COMMENT ON TABLE user_calendar_settings IS 'Stores user availability and calendar preferences';
COMMENT ON TABLE meeting_types IS 'Different types of meetings/services users can offer';
COMMENT ON TABLE user_unavailable_times IS 'Blocks of time when users are unavailable';
COMMENT ON TABLE bookings IS 'Actual appointments/bookings';
COMMENT ON TABLE booking_questions IS 'Custom questions for each meeting type';
COMMENT ON TABLE booking_answers IS 'Answers to custom booking questions';
COMMENT ON TABLE booking_notifications IS 'Track notification history for bookings'; 