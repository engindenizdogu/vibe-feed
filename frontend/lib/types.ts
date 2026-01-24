export type AppStatus = 'pending' | 'analyzing' | 'generating' | 'deploying' | 'live' | 'failed';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface App {
  id: string;
  user_id: string;
  prompt: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  screenshot_url: string | null;
  live_url: string | null;
  status: AppStatus;
  is_published: boolean;
  likes_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  is_liked?: boolean;
}

export interface Comment {
  id: string;
  user_id: string;
  app_id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface GenerationProgress {
  step: 'moderation' | 'analyzing' | 'generating' | 'deploying' | 'finalizing';
  percent: number;
  message: string;
}

export interface GenerationUpdate {
  type: 'status_update' | 'completed' | 'failed';
  step?: string;
  percent?: number;
  message?: string;
  app_id?: string;
  live_url?: string;
  thumbnail_url?: string;
  error_code?: string;
  error_message?: string;
}

export type CreateScreenState = 'idle' | 'generating' | 'live' | 'error';
