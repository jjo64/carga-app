import { Stack } from 'expo-router'
import { theme } from '@/constants/theme'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        contentStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerBackTitle: 'Volver',
      }}
    />
  )
}
