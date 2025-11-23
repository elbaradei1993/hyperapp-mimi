-- Add media_url column to reports table for storing photo/video URLs
ALTER TABLE reports ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN reports.media_url IS 'URL of uploaded media (photo/video) for the safety report';

-- Create index for performance if needed
CREATE INDEX IF NOT EXISTS idx_reports_media_url ON reports(media_url) WHERE media_url IS NOT NULL;
