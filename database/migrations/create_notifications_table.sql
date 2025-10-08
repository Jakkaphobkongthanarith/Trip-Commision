-- Migration file for notifications table
-- Run this in your PostgreSQL database

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Add trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY notifications_select_policy 
    ON notifications FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Policy: Only service role can insert notifications
CREATE POLICY notifications_insert_policy 
    ON notifications FOR INSERT 
    TO service_role 
    WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read, delete)
CREATE POLICY notifications_update_policy 
    ON notifications FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY notifications_delete_policy 
    ON notifications FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, UPDATE, DELETE ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;