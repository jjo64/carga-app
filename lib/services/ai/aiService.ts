import { formatAthleteProfileContext } from './athleteContext'
import { parseVoiceLog, voiceService } from './services/voice.service'
import {
  scanNutritionLabel,
  scanLabel,
  scanMealPlate,
  scanPlate,
  parseNaturalMeal,
  parseMeal,
  closeMacros,
  auditNutritionHealth,
  nutritionAiService,
} from './services/nutrition.service'
import {
  recommendNextLoad,
  recommendLoad,
  evaluateDeload,
  generateMesocycle,
  trainingAiService,
} from './services/training.service'
import {
  adaptExerciseForPain,
  chatWithCoach,
  coachAiService,
} from './services/coach.service'
import { getLifetimeStats, clearAiCache } from './cache'

export { formatAthleteProfileContext }
export { voiceService, nutritionAiService, trainingAiService, coachAiService }

/**
 * Servicio Central de Inteligencia Artificial para Carga App.
 * Composición modular por features de producto con Tool Calling,
 * validación runtime mediante Zod, y hash determinista.
 */
export const aiService = {
  // Voice
  parseVoiceLog,

  // Coach & Biomechanics
  adaptExerciseForPain,
  chatWithCoach,

  // Nutrition
  closeMacros,
  scanNutritionLabel,
  scanLabel,
  scanMealPlate,
  scanPlate,
  parseNaturalMeal,
  parseMeal,
  auditNutritionHealth,

  // Training & Programming
  recommendNextLoad,
  recommendLoad,
  evaluateDeload,
  generateMesocycle,

  // Métricas y Gestión de Caché
  async getUsageStats() {
    return getLifetimeStats()
  },

  async clearCache() {
    return clearAiCache()
  },
}

export default aiService
