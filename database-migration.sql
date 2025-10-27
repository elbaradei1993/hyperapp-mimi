-- Migration to add onboarding and enhanced profile fields to users table

-- Add new columns for enhanced user profiles and onboarding
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS interests TEXT[],
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE;

-- Update existing users to have onboarding_completed = true if they already have profiles
UPDATE public.users
SET onboarding_completed = TRUE,
    onboarding_step = 4,
    profile_completed_at = created_at
WHERE onboarding_completed IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.users.first_name IS 'User first name from onboarding';
COMMENT ON COLUMN public.users.last_name IS 'User last name from onboarding';
COMMENT ON COLUMN public.users.phone IS 'User phone number from onboarding';
COMMENT ON COLUMN public.users.location IS 'User location data as JSON (lat, lng, address)';
COMMENT ON COLUMN public.users.interests IS 'Array of user interests for community matching';
COMMENT ON COLUMN public.users.onboarding_completed IS 'Whether user has completed onboarding';
COMMENT ON COLUMN public.users.onboarding_step IS 'Current onboarding step (0-4)';
COMMENT ON COLUMN public.users.profile_completed_at IS 'When the user profile was completed';

-- Create index on onboarding_completed for performance
CREATE INDEX IF NOT EXISTS users_onboarding_completed_idx ON public.users(onboarding_completed);
CREATE INDEX IF NOT EXISTS users_interests_idx ON public.users USING GIN(interests);

-- Add emergency field to reports table for SOS/vibe distinction
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS emergency BOOLEAN DEFAULT FALSE;

-- Update vibe_type check constraint to include all expected types
ALTER TABLE public.reports
DROP CONSTRAINT IF EXISTS reports_vibe_type_check;

ALTER TABLE public.reports
ADD CONSTRAINT reports_vibe_type_check
CHECK (vibe_type IN ('safe', 'calm', 'lively', 'festive', 'quiet', 'noisy', 'crowded', 'suspicious', 'dangerous'));

-- Add comments for new fields
COMMENT ON COLUMN public.reports.emergency IS 'Whether this report is an emergency (SOS) or regular vibe report';
