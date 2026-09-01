export const theme = {
  colors: {
    background: '#0a0a0a',
    surface: '#141414',
    surfaceSubtle: '#1c1c1c',
    border: '#272727',
    borderLight: '#383838',
    
    // Acentos Carga
    primary: '#00ff88',       // Verde sobrecarga / energía
    primaryMuted: '#0d2818',  // Fondo de acento
    secondary: '#ff4d4d',     // Alertas / fatiga / fallo
    warning: '#ffb703',       // Advertencia / RPE alto
    info: '#38bdf8',          // Información / Carbs
    fat: '#fbbf24',           // Grasa
    
    // Textos
    text: '#ffffff',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 16,
    full: 9999,
  },
} as const

export type Theme = typeof theme
