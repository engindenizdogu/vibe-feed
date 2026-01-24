import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

interface OnboardingStore {
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (value: boolean) => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

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
