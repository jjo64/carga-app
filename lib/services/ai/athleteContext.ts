import { AthleteProfileContext } from './types'

/**
 * Formatea el perfil global del atleta para inyectarlo en el contexto de IA
 * (estándar de producción Heavy / Symmetry).
 * Si no se provee, asigna un baseline coherente y emite un warning informativo en dev.
 */
export function formatAthleteProfileContext(profile?: AthleteProfileContext): string {
  if (!profile || Object.keys(profile).length === 0) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[aiService] Perfil de atleta no proporcionado; aplicando baseline estándar de adulto (75kg, hipertrofia).')
    }
    return `[Perfil Atleta: Peso: 75 kg | Altura: 175 cm | Género: general | Unidad preferida: kg | Objetivo: hipertrofia | Nivel: intermedio]\n\n`
  }

  const parts: string[] = []
  const metrics: string[] = []
  if (profile.weightKg) metrics.push(`Peso: ${profile.weightKg} kg`)
  if (profile.heightCm) metrics.push(`Altura: ${profile.heightCm} cm`)
  if (profile.gender) metrics.push(`Género: ${profile.gender}`)
  if (profile.preferredUnit) metrics.push(`Unidad preferida: ${profile.preferredUnit}`)
  if (profile.goal) metrics.push(`Objetivo: ${profile.goal}`)
  if (profile.experienceLevel) metrics.push(`Nivel: ${profile.experienceLevel}`)
  if (metrics.length > 0) parts.push(`Perfil Atleta: ${metrics.join(' | ')}`)

  if (profile.avgWeeklyVolumeSets || profile.avgRpeLast4Weeks) {
    const hist: string[] = []
    if (profile.avgWeeklyVolumeSets) hist.push(`Volumen promedio: ${profile.avgWeeklyVolumeSets} series/semana`)
    if (profile.avgRpeLast4Weeks) hist.push(`RPE promedio últimas 4 semanas: ${profile.avgRpeLast4Weeks}`)
    parts.push(`Historial reciente: ${hist.join(' | ')}`)
  }

  if (profile.injuriesOrLimitations && profile.injuriesOrLimitations.length > 0) {
    parts.push(`Limitaciones / Molestias articulares: ${profile.injuriesOrLimitations.join(', ')}`)
  }

  if (profile.availableEquipment && profile.availableEquipment.length > 0) {
    parts.push(`Equipamiento disponible: ${profile.availableEquipment.join(', ')}`)
  }

  if (profile.targetDailyCalories || profile.targetDailyMacros) {
    const macros = profile.targetDailyMacros
      ? `(${profile.targetDailyMacros.protein}g P / ${profile.targetDailyMacros.carbs}g C / ${profile.targetDailyMacros.fat}g G)`
      : ''
    parts.push(`Metas nutricionales diarias: ${profile.targetDailyCalories || 'N/A'} kcal ${macros}`.trim())
  }

  return parts.length > 0 ? `${parts.join('\n')}\n\n` : ''
}
