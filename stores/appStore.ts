import { create } from 'zustand';
import type { Profile, UserRole } from '@/types/database';

interface AppState {
  profile: Profile | null;
  isOnboarded: boolean;
  setProfile: (profile: Profile | null) => void;
  setOnboarded: (value: boolean) => void;
  role: UserRole | null;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  isOnboarded: false,
  setProfile: (profile) => set({ profile }),
  setOnboarded: (value) => set({ isOnboarded: value }),
  get role() {
    return get().profile?.role ?? null;
  },
}));
