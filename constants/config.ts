export const config = {
  appName: 'FitPro',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  features: {
    chat: true,
    payments: true,
    personal: true,
    reports: true,
  },
} as const;
