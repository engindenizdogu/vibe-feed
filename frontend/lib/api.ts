import { supabase } from './supabase';
import type { App, Comment, User } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Apps
export async function getApps(page = 1, limit = 20): Promise<{ apps: App[]; hasMore: boolean }> {
  return apiRequest(`/api/v1/apps?page=${page}&limit=${limit}`);
}

export async function getApp(id: string): Promise<App> {
  return apiRequest(`/api/v1/apps/${id}`);
}

// Response from create endpoint (MVP-style synchronous)
export interface CreateAppResponse {
  app_id: string;
  title: string;
  description: string;
  live_url: string;
  vibe_analysis: Record<string, any>;
  tags: string[];
}

export async function createApp(prompt: string): Promise<CreateAppResponse> {
  return apiRequest('/api/v1/apps', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

export async function publishApp(id: string, title: string, description?: string): Promise<App> {
  return apiRequest(`/api/v1/apps/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  });
}

export async function deleteApp(id: string): Promise<void> {
  return apiRequest(`/api/v1/apps/${id}`, { method: 'DELETE' });
}

// Likes
export async function likeApp(id: string): Promise<void> {
  return apiRequest(`/api/v1/apps/${id}/like`, { method: 'POST' });
}

export async function unlikeApp(id: string): Promise<void> {
  return apiRequest(`/api/v1/apps/${id}/like`, { method: 'DELETE' });
}

// Comments
export async function getComments(appId: string): Promise<Comment[]> {
  return apiRequest(`/api/v1/apps/${appId}/comments`);
}

export async function addComment(appId: string, content: string): Promise<Comment> {
  return apiRequest(`/api/v1/apps/${appId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

// Users
export async function getCurrentUser(): Promise<User> {
  return apiRequest('/api/v1/users/me');
}

export async function updateUser(data: Partial<User>): Promise<User> {
  return apiRequest('/api/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getUserApps(userId: string): Promise<App[]> {
  return apiRequest(`/api/v1/users/${userId}/apps`);
}

// WebSocket for generation updates
export function connectGenerationWebSocket(
  jobId: string,
  onMessage: (data: any) => void,
  onError: (error: Event) => void,
  onClose: () => void
): WebSocket {
  const wsUrl = API_URL.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/ws/generation/${jobId}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };

  ws.onerror = onError;
  ws.onclose = onClose;

  return ws;
}
