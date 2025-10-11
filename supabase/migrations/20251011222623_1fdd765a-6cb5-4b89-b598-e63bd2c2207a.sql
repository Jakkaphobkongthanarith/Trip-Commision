-- Add pdf_url column to travel_packages table
ALTER TABLE travel_packages 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add sample PDF URL to existing packages for testing
UPDATE travel_packages 
SET pdf_url = '/sample-package-details.pdf'
WHERE id IN (
  SELECT id FROM travel_packages LIMIT 3
);