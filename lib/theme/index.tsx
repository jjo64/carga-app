import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ThemeMode = 'dark' | 'light'

export interface ThemeColors {
  background: string
  card: string
  cardSubtle: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  primary: string
  primaryLight: string
  secondary: string
  accent: string
  surface: string
}

export const darkColors: ThemeColors = {
  background: '#0A0A0A',
  card: '#121212',
  cardSubtle: '#181818',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  primary: '#38BDF8',
  primaryLight: 'rgba(56, 189, 248, 0.12)',
  secondary: '#2563EB',
  accent: '#00FF88',
  surface: '#1A1A1A',
}

export const lightColors: ThemeColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardSubtle: '#F1F5F9',
  border: 'rgba(0, 0, 0, 0.08)',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#0284C7',
  primaryLight: 'rgba(2, 132, 199, 0.1)',
  secondary: '#2563EB',
  accent: '#10B981',
  surface: '#FFFFFF',
}

interface ThemeContextType {
  mode: ThemeMode
  isDark: boolean
  colors: ThemeColors
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = '@fitness_ia_theme_mode'

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  isDark: true,
  colors: darkColors,
  setMode: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY)
        if (saved === 'dark' || saved === 'light') {
          setModeState(saved)
        }
      } catch (e) {
        console.log('Error loading theme:', e)
      }
    }
    loadTheme()
  }, [])

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode)
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode)
    } catch (e) {
      console.log('Error saving theme:', e)
    }
  }

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
  }

  const colors = mode === 'dark' ? darkColors : lightColors
  const isDark = mode === 'dark'

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
