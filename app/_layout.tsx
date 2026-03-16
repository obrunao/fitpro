import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/appStore';
import { theme } from '@/constants/theme';
import type { Session } from '@supabase/supabase-js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

function AuthGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const { profile, setProfile, isOnboarded } = useAppStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile when session changes
  useEffect(() => {
    if (session?.user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
          } else {
            setProfile(null);
          }
        });
    } else if (session === null) {
      setProfile(null);
    }
  }, [session?.user?.id]);

  // Route guard
  useEffect(() => {
    if (session === undefined) return; // still loading

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session) {
      // Not signed in — go to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (!profile) {
      // Signed in but no profile — go to onboarding
      if (!inOnboarding && !inAuthGroup) {
        // Wait a bit for profile fetch
      }
    } else if (!profile.role) {
      // Has profile but no role — onboarding
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
    } else {
      // Fully set up — go to appropriate tabs
      const inTeacher = segments[0] === '(teacher)';
      const inStudent = segments[0] === '(student)';

      if (profile.role === 'teacher' && !inTeacher) {
        router.replace('/(teacher)/dashboard');
      } else if (profile.role === 'student' && !inStudent) {
        router.replace('/(student)/dashboard');
      }
    }
  }, [session, profile, segments]);

  if (session === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <AuthGate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neutral[50],
  },
});
