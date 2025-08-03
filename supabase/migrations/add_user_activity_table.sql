-- Create user_activity table for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_target_user_id ON user_activity(target_user_id);

-- Add RLS policies for user_activity table
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activity
CREATE POLICY "Users can view own activity" ON user_activity
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can view all activity
CREATE POLICY "Admins can view all activity" ON user_activity
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Users can insert their own activity
CREATE POLICY "Users can insert own activity" ON user_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can insert activity for any user
CREATE POLICY "Admins can insert any activity" ON user_activity
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Add some common activity types as comments for reference
COMMENT ON TABLE user_activity IS 'Tracks user actions and behaviors for analytics and audit purposes';
COMMENT ON COLUMN user_activity.action IS 'Type of action performed (e.g., login, logout, email_sent, project_created, user_created, user_updated, user_deleted)';
COMMENT ON COLUMN user_activity.details IS 'Human-readable description of the action';
COMMENT ON COLUMN user_activity.target_user_id IS 'ID of user affected by this action (if applicable)';
COMMENT ON COLUMN user_activity.ip_address IS 'IP address of the user when action was performed';
COMMENT ON COLUMN user_activity.user_agent IS 'User agent string for browser/device identification'; 