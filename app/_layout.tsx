import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native'
import { theme } from '@/constants/theme'
import { AuthProvider, useAuth } from '@/lib/hooks/useAuth'
import { LanguageProvider } from '@/lib/i18n'
import { ThemeProvider, useTheme } from '@/lib/theme'

function RootNavigator() {
  const { session, profile, loading } = useAuth()
  const { isDark, colors } = useTheme()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const isOnboarding = (segments[0] as string) === 'onboarding'

    // 1. Si no hay sesión y no estamos en auth, enviar al login
    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login')
      }
      return
    }

    // 2. Si hay sesión: verificar si completó onboarding
    const hasCompletedOnboarding =
      profile?.onboarding_completed === true ||
      (profile?.height_cm && profile?.goal && profile?.gender)

    if (!hasCompletedOnboarding) {
      if (!isOnboarding) {
        router.replace('/onboarding')
      }
    } else {
      // Ya completó onboarding: si está en auth o en onboarding, enviar a tabs
      if (inAuthGroup || isOnboarding) {
        router.replace('/(tabs)')
      }
    }
  }, [session, profile, loading, segments])

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  )
}

function ThemedAppContainer() {
  const { isDark, colors } = useTheme()

  return (
    <View style={[styles.wrapper, { backgroundColor: isDark ? '#050505' : '#E2E8F0' }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </View>
    </View>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ThemedAppContainer />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 680 : undefined,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
