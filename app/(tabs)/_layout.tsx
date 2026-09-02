import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { theme } from '@/constants/theme'
import { useLanguage } from '@/lib/i18n'
import { Zap, Dumbbell, Apple, TrendingUp, User } from 'lucide-react-native'

export default function TabsLayout() {
  const { t } = useLanguage()

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#07080D',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_dashboard'),
          headerTitle: '⚡ CARGA',
          tabBarIcon: ({ color, size }) => (
            <Zap color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('tab_workout'),
          headerTitle: '⚡ Carga',
          tabBarIcon: ({ color, size }) => (
            <Dumbbell color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t('tab_nutrition'),
          headerTitle: t('tab_nutrition'),
          tabBarIcon: ({ color, size }) => (
            <Apple color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('tab_progress'),
          headerTitle: t('tab_progress'),
          tabBarIcon: ({ color, size }) => (
            <TrendingUp color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          headerTitle: t('tab_profile'),
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  )
}
