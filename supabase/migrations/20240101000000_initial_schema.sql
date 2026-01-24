-- Slop Feed Initial Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create apps table
CREATE TABLE IF NOT EXISTS public.apps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    screenshot_url TEXT,
    live_url TEXT,
    source_code JSONB,
    daytona_workspace_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'generating', 'deploying', 'live', 'failed')),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, app_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apps_user_id ON public.apps(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_is_published ON public.apps(is_published);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON public.apps(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_status ON public.apps(status);
CREATE INDEX IF NOT EXISTS idx_likes_app_id ON public.likes(app_id);
CREATE INDEX IF NOT EXISTS idx_comments_app_id ON public.comments(app_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apps_updated_at
    BEFORE UPDATE ON public.apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment likes
CREATE OR REPLACE FUNCTION increment_likes(app_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.apps
    SET likes_count = likes_count + 1
    WHERE id = app_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrement likes
CREATE OR REPLACE FUNCTION decrement_likes(app_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.apps
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = app_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, username, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all profiles"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for apps
CREATE POLICY "Anyone can view published apps"
    ON public.apps FOR SELECT
    USING (is_published = true OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create apps"
    ON public.apps FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own apps"
    ON public.apps FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own apps"
    ON public.apps FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for likes
CREATE POLICY "Anyone can view likes"
    ON public.likes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can like apps"
    ON public.likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own likes"
    ON public.likes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for comments
CREATE POLICY "Anyone can view comments"
    ON public.comments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can comment"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON public.comments FOR DELETE
    USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_likes(UUID) TO authenticated;
