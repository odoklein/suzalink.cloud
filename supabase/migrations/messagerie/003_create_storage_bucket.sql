-- =====================================================
-- CREATE STORAGE BUCKET FOR MESSAGERIE FILES
-- =====================================================

-- Create storage bucket for messagerie files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messagerie-files',
  'messagerie-files',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO NOTHING;
