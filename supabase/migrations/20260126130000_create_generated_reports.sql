-- Create generated_reports table
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY, -- reportId passed from function
  user_id TEXT NOT NULL,
  period_type TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only select their own reports
CREATE POLICY "Users can only access own reports"
ON generated_reports
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users (or authenticated functions) can insert their own reports
-- Note: Edge functions usually run with service_role if they need to bypass RLS,
-- or with the user's auth context.
-- If running as user, simple insert policy:
CREATE POLICY "Users can insert own reports"
ON generated_reports
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Auto delete old reports (optional, can be done via cron or manual cleanup)
-- Keeping it simple for now.
