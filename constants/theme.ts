export const theme = {
  colors: {
    // ── 1. Tokens Globales Neutros Profundos (Zinc Scale) ──
    background: '#09090B',       // Zinc 950 - Fondo absoluto (anti-smearing OLED)
    surface: '#18181B',          // Zinc 900 - Tarjetas contenedoras, modales, widgets
    surfaceSubtle: '#27272A',    // Zinc 800 - Campos inactivos, fondos de barras
    border: '#27272A',           // Zinc 800 - Bordes estructurales de 1px
    borderHighlight: '#3F3F46',  // Zinc 700 - Separadores activos o selecciones

    // ── 2. Tipografía y Contraste WCAG ──
    text: '#FAFAFA',             // Zinc 50 - Títulos, números grandes, CTAs principales
    textSecondary: '#A1A1AA',    // Zinc 400 - Subtítulos, unidades (kg, reps, g), placeholders
    textMuted: '#71717A',        // Zinc 500 - Timestamps, notas técnicas secundarias

    // ── 3. Módulo Entrenamiento: Onyx & Chalk ──
    actionPrimary: '#FFFFFF',    // Blanco tiza para CTAs ("Comenzar Entrenamiento")
    actionPrimaryText: '#09090B',// Texto negro en botones principales
    setRowActiveBg: '#27272A',   // Fondo para serie activa
    setRowActiveBorder: '#FFFFFF',// Borde blanco para serie activa

    // ── 4. Módulo Nutrición: Paleta Orgánica Funcional ──
    nutritionAccent: '#A3E635',  // Lima Eléctrico / Verde Matcha (Vitalidad / Kcal meta)
    protein: '#38BDF8',          // Cian / Sky (Músculo y recuperación)
    carbs: '#F59E0B',            // Ámbar Solar (Energía glucolítica)
    fat: '#FB7185',              // Salmón Cálido / Terracota (Grasas saludables)
    fiber: '#34D399',            // Esmeralda Suave (Verduras y fibra)
    calorieWarning: '#F97316',   // Naranja quemado (Desviación calórica)

    // ── 5. Módulo Inteligencia Artificial (Coach, Visión & Macros) ──
    aiSurface: '#18181B',        // Superficie oscura neutra
    aiBorder: '#7C3AED',         // Borde amatista sutil
    aiAccent: '#A78BFA',         // Lavanda / Violeta desaturado
    aiAccentLight: '#C4B5FD',    // Lavanda brillante para texto/icono

    // ── 6. Estados Semánticos Fisiológicos ──
    optimal: '#10B981',          // Verde esmeralda (Recuperado / PR Ready)
    caution: '#F59E0B',          // Ámbar (Fatiga moderada)
    danger: '#EF4444',           // Rojo carmín (Fallo / RIR 0 / Sobrecarga)
    info: '#38BDF8',
    primary: '#00ff88',          // Fallback compatibilidad
    primaryMuted: '#0d2818',
    secondary: '#ff4d4d',
    warning: '#ffb703',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 28,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    full: 9999,
  },
} as const

export type Theme = typeof theme
