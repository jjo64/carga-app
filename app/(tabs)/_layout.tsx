import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { Home, Dumbbell, Apple, TrendingUp, User } from 'lucide-react-native'
import { typography } from '@/constants/typography'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#09090B', // Zinc 950
          borderTopColor: '#27272A', // Zinc 800
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#FAFAFA', // Blanco puro
        tabBarInactiveTintColor: '#71717A', // Zinc 500
        tabBarLabelStyle: {
          ...typography.navLabel,
        },
        headerStyle: {
          backgroundColor: '#09090B',
        },
        headerTintColor: '#FAFAFA',
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
          title: 'Inicio',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Entrenar',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Dumbbell color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrición',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Apple color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TrendingUp color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size - 2} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  )
}
