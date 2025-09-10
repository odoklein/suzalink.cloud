-- Create email_template_categories table
CREATE TABLE IF NOT EXISTS email_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_template_categories_user_id_name_key UNIQUE (user_id, name)
);

-- Add category_id column to email_templates table
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES email_template_categories(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_email_template_categories_user_id ON email_template_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_email_template_categories_is_default ON email_template_categories(is_default);
CREATE INDEX IF NOT EXISTS idx_email_templates_category_id ON email_templates(category_id);



-- Function to ensure only one default category per user
CREATE OR REPLACE FUNCTION ensure_single_default_category()
RETURNS TRIGGER AS $$
BEGIN
  -- If this category is being set as default, unset all other defaults for this user
  IF NEW.is_default = TRUE THEN
    UPDATE email_template_categories 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure single default category
DROP TRIGGER IF EXISTS trigger_ensure_single_default_category ON email_template_categories;
CREATE TRIGGER trigger_ensure_single_default_category
  BEFORE INSERT OR UPDATE ON email_template_categories
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_category();

-- Create default categories for existing users
INSERT INTO email_template_categories (user_id, name, color, is_default)
SELECT DISTINCT user_id, 'General', '#3B82F6', TRUE
FROM email_templates
WHERE user_id NOT IN (SELECT user_id FROM email_template_categories);

-- Update existing templates to use the default category
UPDATE email_templates 
SET category_id = (
  SELECT id FROM email_template_categories 
  WHERE user_id = email_templates.user_id AND is_default = TRUE
)
WHERE category_id IS NULL;
