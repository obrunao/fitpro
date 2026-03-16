import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/constants/config';
import { storage } from './storage';

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
