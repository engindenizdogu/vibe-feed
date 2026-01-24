-- Slop Feed Storage Buckets
-- Run this in your Supabase SQL Editor after the initial schema

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('thumbnails', 'thumbnails', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('screenshots', 'screenshots', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for thumbnails
CREATE POLICY "Anyone can view thumbnails"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'thumbnails');

CREATE POLICY "Service role can upload thumbnails"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'thumbnails');

-- Storage policies for screenshots
CREATE POLICY "Anyone can view screenshots"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'screenshots');

CREATE POLICY "Service role can upload screenshots"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'screenshots');
