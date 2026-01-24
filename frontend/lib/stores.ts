import { create } from 'zustand';
import type { User, App, CreateScreenState, GenerationProgress } from './types';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));

interface CreateStore {
  prompt: string;
  state: CreateScreenState;
  progress: GenerationProgress | null;
  currentApp: App | null;
  error: string | null;
  jobId: string | null;

  setPrompt: (prompt: string) => void;
  setState: (state: CreateScreenState) => void;
  setProgress: (progress: GenerationProgress | null) => void;
  setCurrentApp: (app: App | null) => void;
  setError: (error: string | null) => void;
  setJobId: (jobId: string | null) => void;
  reset: () => void;
}

export const useCreateStore = create<CreateStore>((set) => ({
  prompt: '',
  state: 'idle',
  progress: null,
  currentApp: null,
  error: null,
  jobId: null,

  setPrompt: (prompt) => set({ prompt }),
  setState: (state) => set({ state }),
  setProgress: (progress) => set({ progress }),
  setCurrentApp: (currentApp) => set({ currentApp }),
  setError: (error) => set({ error }),
  setJobId: (jobId) => set({ jobId }),
  reset: () => set({
    prompt: '',
    state: 'idle',
    progress: null,
    currentApp: null,
    error: null,
    jobId: null,
  }),
}));
