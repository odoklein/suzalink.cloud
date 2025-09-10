-- =====================================================
-- EMAIL TEMPLATE CATEGORIES SCHEMA
-- User-defined categories for organizing templates
-- =====================================================

-- Email template categories table
CREATE TABLE IF NOT EXISTS public.email_template_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_template_categories_pkey PRIMARY KEY (id),
  CONSTRAINT email_template_categories_user_id_name_key UNIQUE (user_id, name),
  CONSTRAINT email_template_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Add category_id to email_templates table
ALTER TABLE public.email_templates
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.email_template_categories(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_template_categories_user_id ON public.email_template_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category_id ON public.email_templates(category_id);

-- Add triggers for updated_at
CREATE TRIGGER update_email_template_categories_updated_at
  BEFORE UPDATE ON public.email_template_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for all users
INSERT INTO public.email_template_categories (user_id, name, description, color, is_default)
SELECT DISTINCT
  u.id as user_id,
  category_data.name,
  category_data.description,
  category_data.color,
  true as is_default
FROM public.users u
CROSS JOIN (
  VALUES
    ('Prospect Outreach', 'Templates for initial contact with prospects', '#10B981'),
    ('Follow-up', 'Templates for following up with prospects', '#F59E0B'),
    ('Meeting Requests', 'Templates for scheduling meetings', '#3B82F6'),
    ('Thank You', 'Thank you and confirmation templates', '#8B5CF6'),
    ('General', 'General purpose templates', '#6B7280')
) AS category_data(name, description, color)
ON CONFLICT (user_id, name) DO NOTHING;
