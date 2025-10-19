-- Add pdf_url column to package_advertisers table
ALTER TABLE package_advertisers 
ADD COLUMN IF NOT EXISTS pdf_url TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN package_advertisers.pdf_url IS 'Optional PDF URL for advertiser-package relationship';