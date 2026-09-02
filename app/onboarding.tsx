import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  User,
  Activity,
  Target,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Flame,
  Award,
  Zap,
  Dumbbell,
  ShieldCheck,
  Scale,
} from 'lucide-react-native'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Gender, Goal, ActivityLevel, ExperienceLevel } from '@/types'
import { calculateBMR, calculateTDEE, calculateTargetCalories } from '@/lib/utils/calories'
import { generateRoutinesForUser } from '@/lib/utils/routineGenerator'

export default function OnboardingScreen() {
  const router = useRouter()
  const { user, profile, updateProfile } = useAuth()

  // Steps: 1 -> 2 -> 3 -> 4 -> 5
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Datos Físicos
  const [name, setName] = useState(profile?.name || '')
  const [gender, setGender] = useState<Gender>('male')
  const [age, setAge] = useState('24')
  const [heightCm, setHeightCm] = useState('175')
  const [weightKg, setWeightKg] = useState('75')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')

  // Step 2: Nivel de Experiencia
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner')

  // Step 3: Objetivo
  const [goal, setGoal] = useState<Goal>('muscle_gain')

  // Step 4: Días de entrenamiento
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3)

  // Calculations for Step 5
  const parsedWeight = parseFloat(weightKg) || 70
  const parsedHeight = parseFloat(heightCm) || 175
  const parsedAge = parseInt(age, 10) || 25

  const birthDateDerived = `${new Date().getFullYear() - parsedAge}-01-01`

  const mockProfileCalc = {
    gender,
    height_cm: parsedHeight,
    birth_date: birthDateDerived,
    goal,
    activity_level: activityLevel,
  }

  const bmr = calculateBMR(mockProfileCalc, parsedWeight)
  const tdee = calculateTDEE(bmr, activityLevel)
  const targetCalories = calculateTargetCalories(tdee, goal)

  const proteinTarget = Math.round(parsedWeight * (goal === 'fat_loss' ? 2.2 : 2.0))
  const fatTarget = Math.round(parsedWeight * 0.9)
  const remainingCals = Math.max(0, targetCalories - (proteinTarget * 4 + fatTarget * 9))
  const carbsTarget = Math.round(remainingCals / 4)

  const generatedRoutines = generateRoutinesForUser({
    level: experienceLevel,
    goal,
    daysPerWeek,
  })

  const handleNext = () => {
    if (currentStep === 1) {
      if (!parsedHeight || parsedHeight < 100 || parsedHeight > 240) {
        Alert.alert('Altura inválida', 'Por favor ingresa una altura válida en cm (ej: 175).')
        return
      }
      if (!parsedWeight || parsedWeight < 35 || parsedWeight > 250) {
        Alert.alert('Peso inválido', 'Por favor ingresa un peso válido en kg (ej: 75).')
        return
      }
    }
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleFinishOnboarding = async () => {
    if (!user) return
    setSaving(true)

    try {
      // 1. Guardar perfil completo en Supabase
      await updateProfile({
        name: name.trim() || profile?.name || 'Atleta',
        gender,
        height_cm: parsedHeight,
        birth_date: birthDateDerived,
        goal,
        activity_level: activityLevel,
        experience_level: experienceLevel,
        training_days_per_week: daysPerWeek,
        onboarding_completed: true,
        initial_weight_kg: parsedWeight,
      })

      // 2. Registrar peso inicial en body_weight
      const todayStr = new Date().toISOString().split('T')[0]
      await supabase.from('body_weight').insert({
        user_id: user.id,
        date: todayStr,
        weight_kg: parsedWeight,
      })

      // 3. Insertar rutinas generadas en Supabase
      for (let i = 0; i < generatedRoutines.length; i++) {
        const r = generatedRoutines[i]
        const encodedDesc = r.assigned_days.length > 0
          ? `__DAYS:${r.assigned_days.join(',')}__ ${r.description}`
          : r.description

        const { data: routineData, error: routineErr } = await supabase
          .from('routines')
          .insert({
            user_id: user.id,
            name: r.name,
            description: encodedDesc,
            sort_order: i,
            is_active: true,
          })
          .select('id')
          .single()

        if (!routineErr && routineData) {
          const exercisesToInsert = r.exercises.map((e, idx) => ({
            routine_id: routineData.id,
            name: e.name,
            target_sets: e.target_sets,
            target_reps: e.target_reps,
            rest_seconds: e.rest_seconds,
            notes: e.notes || null,
            sort_order: idx,
          }))

          await supabase.from('routine_exercises').insert(exercisesToInsert)
        }
      }

      // 4. Redirigir al inicio
      router.replace('/(tabs)')
    } catch (err) {
      console.log('Error completing onboarding:', err)
      // Redirigir de todas formas para no bloquear la app
      router.replace('/(tabs)')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* ── Top Header / Stepper Progress ── */}
      <View style={styles.topBar}>
        <View style={styles.stepperHeaderRow}>
          {currentStep > 1 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ChevronLeft color="#38BDF8" size={22} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}

          <Text style={styles.stepperStepText}>PASO {currentStep} DE 5</Text>

          <View style={{ width: 36 }} />
        </View>

        {/* Progress Bar Segments */}
        <View style={styles.progressSegmentsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                s <= currentStep && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================= */}
        {/* PASO 1: DATOS FÍSICOS BÁSICOS */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <View style={styles.stepBox}>
            <View style={styles.stepTitleBox}>
              <Text style={styles.stepBadge}>PARÁMETROS FÍSICOS</Text>
              <Text style={styles.stepTitle}>Cuéntanos sobre ti</Text>
              <Text style={styles.stepSubtitle}>
                Estos datos son esenciales para calcular con precisión tu metabolismo basal, gasto calórico y macronutrientes.
              </Text>
            </View>

            {/* Nombre / Apodo */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Tu Nombre o Apodo</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Josué"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Género Biológico */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Sexo Biológico</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, gender === 'male' && styles.toggleBtnActive]}
                  onPress={() => setGender('male')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleBtnText, gender === 'male' && styles.toggleBtnTextActive]}>
                    Hombre ♂
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, gender === 'female' && styles.toggleBtnActive]}
                  onPress={() => setGender('female')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleBtnText, gender === 'female' && styles.toggleBtnTextActive]}>
                    Mujer ♀
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Edad, Altura y Peso en fila */}
            <View style={styles.metricsRow}>
              <View style={[styles.inputCard, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Edad</Text>
                <View style={styles.unitInputBox}>
                  <TextInput
                    style={styles.unitInput}
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                    maxLength={3}
                  />
                  <Text style={styles.unitText}>años</Text>
                </View>
              </View>

              <View style={[styles.inputCard, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Altura</Text>
                <View style={styles.unitInputBox}>
                  <TextInput
                    style={styles.unitInput}
                    keyboardType="numeric"
                    value={heightCm}
                    onChangeText={setHeightCm}
                    maxLength={3}
                  />
                  <Text style={styles.unitText}>cm</Text>
                </View>
              </View>

              <View style={[styles.inputCard, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Peso</Text>
                <View style={styles.unitInputBox}>
                  <TextInput
                    style={styles.unitInput}
                    keyboardType="numeric"
                    value={weightKg}
                    onChangeText={setWeightKg}
                    maxLength={5}
                  />
                  <Text style={styles.unitText}>kg</Text>
                </View>
              </View>
            </View>

            {/* Nivel de Actividad Diaria */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Nivel de Actividad Diaria (Fuera del gimnasio)</Text>
              <View style={styles.optionsList}>
                {[
                  { key: 'sedentary', label: 'Sedentario', desc: 'Trabajo de escritorio, poco movimiento' },
                  { key: 'light', label: 'Ligera', desc: 'Caminatas ocasionales o tareas ligeras' },
                  { key: 'moderate', label: 'Moderada', desc: 'De pie la mayor parte del día o trabajo activo' },
                  { key: 'active', label: 'Muy Activa', desc: 'Trabajo físico pesado o mucho movimiento' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.optionCard, activityLevel === item.key && styles.optionCardActive]}
                    onPress={() => setActivityLevel(item.key as ActivityLevel)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, activityLevel === item.key && styles.optionTitleActive]}>
                        {item.label}
                      </Text>
                      <Text style={styles.optionDesc}>{item.desc}</Text>
                    </View>
                    {activityLevel === item.key && (
                      <View style={styles.checkCircle}>
                        <Check color="#FFFFFF" size={14} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASO 2: NIVEL DE ENTRENAMIENTO */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <View style={styles.stepBox}>
            <View style={styles.stepTitleBox}>
              <Text style={styles.stepBadge}>EXPERIENCIA</Text>
              <Text style={styles.stepTitle}>¿Cuánto tiempo llevas entrenando?</Text>
              <Text style={styles.stepSubtitle}>
                Adaptamos la selección de ejercicios, volumen de series y descansos según tu nivel.
              </Text>
            </View>

            <View style={styles.optionsList}>
              {[
                {
                  key: 'beginner',
                  title: 'Principiante',
                  time: 'Menos de 6 meses o empezando',
                  desc: 'Aprender patrones de movimiento fundamentales, ganar fuerza lineal y construir consistencia con técnica limpia.',
                  icon: '🌱',
                },
                {
                  key: 'intermediate',
                  title: 'Intermedio',
                  time: '6 meses a 2 años de experiencia',
                  desc: 'Dominas la técnica básica. Buscas sobrecarga progresiva sistemática, variedad de estímulos y mayor volumen.',
                  icon: '⚡',
                },
                {
                  key: 'advanced',
                  title: 'Avanzado',
                  time: 'Más de 2 años entrenando en serio',
                  desc: 'Técnica pulida y alta tolerancia al esfuerzo. Rutinas de alta intensidad, periodización y trabajo de aislamiento.',
                  icon: '🏆',
                },
              ].map((lvl) => (
                <TouchableOpacity
                  key={lvl.key}
                  style={[styles.levelCard, experienceLevel === lvl.key && styles.levelCardActive]}
                  onPress={() => {
                    setExperienceLevel(lvl.key as ExperienceLevel)
                    if (lvl.key === 'beginner' && daysPerWeek > 4) setDaysPerWeek(3)
                    if (lvl.key === 'advanced' && daysPerWeek < 4) setDaysPerWeek(5)
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.levelCardTop}>
                    <Text style={{ fontSize: 26 }}>{lvl.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.levelTitle, experienceLevel === lvl.key && styles.levelTitleActive]}>
                        {lvl.title}
                      </Text>
                      <Text style={styles.levelTime}>{lvl.time}</Text>
                    </View>
                    {experienceLevel === lvl.key && (
                      <View style={styles.checkCircle}>
                        <Check color="#FFFFFF" size={14} strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.levelDesc}>{lvl.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASO 3: OBJETIVO PRINCIPAL */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <View style={styles.stepBox}>
            <View style={styles.stepTitleBox}>
              <Text style={styles.stepBadge}>OBJETIVO</Text>
              <Text style={styles.stepTitle}>¿Cuál es tu meta principal?</Text>
              <Text style={styles.stepSubtitle}>
                Ajustamos tu balance calórico, ingesta de proteína y el tipo de estímulo en tus entrenamientos.
              </Text>
            </View>

            <View style={styles.optionsList}>
              {[
                {
                  key: 'muscle_gain',
                  title: 'Hipertrofia & Fuerza',
                  tag: 'Superávit (+300 kcal)',
                  desc: 'Maximizar el crecimiento muscular y progresar en kilos levantados con una ingesta energética positiva.',
                  icon: '💪',
                  color: '#38BDF8',
                },
                {
                  key: 'fat_loss',
                  title: 'Definición / Pérdida de Grasa',
                  tag: 'Déficit (-400 kcal)',
                  desc: 'Reducir el porcentaje de grasa corporal manteniendo la máxima masa muscular posible y alta proteína.',
                  icon: '🔥',
                  color: '#EF4444',
                },
                {
                  key: 'recomp',
                  title: 'Recomposición Corporal',
                  tag: 'Ligero Déficit (-150 kcal)',
                  desc: 'Perder grasa y construir músculo al mismo tiempo. Ideal para principiantes o tras un periodo de descanso.',
                  icon: '⚡',
                  color: '#F59E0B',
                },
                {
                  key: 'maintenance',
                  title: 'Mantenimiento & Salud',
                  tag: 'Equilibrio (0 kcal)',
                  desc: 'Mantener tu peso y porcentaje actual optimizando tu rendimiento atlético, energía y bienestar.',
                  icon: '⚖️',
                  color: '#10B981',
                },
              ].map((g) => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.goalCard, goal === g.key && styles.goalCardActive]}
                  onPress={() => setGoal(g.key as Goal)}
                  activeOpacity={0.85}
                >
                  <View style={styles.goalCardHeader}>
                    <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalTitle, goal === g.key && styles.goalTitleActive]}>
                        {g.title}
                      </Text>
                      <View style={[styles.goalTagBadge, { backgroundColor: `${g.color}15`, borderColor: `${g.color}35` }]}>
                        <Text style={[styles.goalTagText, { color: g.color }]}>{g.tag}</Text>
                      </View>
                    </View>
                    {goal === g.key && (
                      <View style={styles.checkCircle}>
                        <Check color="#FFFFFF" size={14} strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.goalDesc}>{g.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASO 4: FRECUENCIA DE DÍAS */}
        {/* ========================================================= */}
        {currentStep === 4 && (
          <View style={styles.stepBox}>
            <View style={styles.stepTitleBox}>
              <Text style={styles.stepBadge}>DISPONIBILIDAD</Text>
              <Text style={styles.stepTitle}>¿Cuántos días por semana vas a entrenar?</Text>
              <Text style={styles.stepSubtitle}>
                Estructuramos la división de grupos musculares para que recuperes al 100% entre sesiones.
              </Text>
            </View>

            <View style={styles.optionsList}>
              {[
                {
                  days: 3,
                  title: '3 Días por semana',
                  split: 'Full Body (Cuerpo Completo)',
                  schedule: 'Lunes · Miércoles · Viernes',
                  desc: 'Máxima eficiencia de tiempo. Trabajas cada músculo 3 veces por semana con volumen óptimo.',
                },
                {
                  days: 4,
                  title: '4 Días por semana',
                  split: 'Torso / Pierna x2',
                  schedule: 'Lunes · Martes · Jueves · Viernes',
                  desc: 'El balance ideal para la mayoría de atletas. 2 días de tren superior y 2 de tren inferior.',
                },
                {
                  days: 5,
                  title: '5 Días por semana',
                  split: 'Push / Pull / Legs / Torso / Pierna',
                  schedule: 'Lunes a Viernes (Finde descanso)',
                  desc: 'Distribución avanzada para aislar cada músculo con máximo volumen e intensidad.',
                },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  style={[styles.freqCard, daysPerWeek === opt.days && styles.freqCardActive]}
                  onPress={() => setDaysPerWeek(opt.days)}
                  activeOpacity={0.85}
                >
                  <View style={styles.freqHeader}>
                    <View style={styles.freqNumberBox}>
                      <Text style={styles.freqNumberText}>{opt.days}</Text>
                      <Text style={styles.freqNumberSub}>DÍAS</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.freqTitle, daysPerWeek === opt.days && styles.freqTitleActive]}>
                        {opt.title}
                      </Text>
                      <Text style={styles.freqSplit}>{opt.split}</Text>
                      <Text style={styles.freqSchedule}>📅 {opt.schedule}</Text>
                    </View>

                    {daysPerWeek === opt.days && (
                      <View style={styles.checkCircle}>
                        <Check color="#FFFFFF" size={14} strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.freqDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* PASO 5: RESUMEN Y PLAN GENERADO */}
        {/* ========================================================= */}
        {currentStep === 5 && (
          <View style={styles.stepBox}>
            <View style={styles.stepTitleBox}>
              <View style={styles.readyBadge}>
                <Sparkles color="#38BDF8" size={16} />
                <Text style={styles.readyBadgeText}>PLAN PERSONALIZADO LISTO</Text>
              </View>
              <Text style={styles.stepTitle}>Tu estrategia está configurada</Text>
              <Text style={styles.stepSubtitle}>
                Hemos calculado tus requerimientos energéticos y diseñado tu plan de rutinas semanal.
              </Text>
            </View>

            {/* Target Calories & Macros Card */}
            <View style={styles.summaryResultCard}>
              <Text style={styles.resultCardHeader}>OBJETIVO NUTRICIONAL DIARIO</Text>
              
              <View style={styles.caloriesBigRow}>
                <View>
                  <Text style={styles.caloriesBigNumber}>{targetCalories}</Text>
                  <Text style={styles.caloriesBigUnit}>KCAL / DÍA</Text>
                </View>

                <View style={styles.metaCalcsCol}>
                  <Text style={styles.metaCalcLine}>Metabolismo Basal (BMR): <Text style={{ color: '#FFFFFF' }}>{bmr} kcal</Text></Text>
                  <Text style={styles.metaCalcLine}>Gasto Diario (TDEE): <Text style={{ color: '#FFFFFF' }}>{tdee} kcal</Text></Text>
                </View>
              </View>

              {/* Macros Breakdown */}
              <View style={styles.macrosSummaryRow}>
                <View style={styles.macroSummaryBox}>
                  <Text style={styles.macroSummaryVal}>{proteinTarget}g</Text>
                  <Text style={styles.macroSummaryLabel}>Proteína</Text>
                  <View style={[styles.macroBar, { backgroundColor: '#38BDF8' }]} />
                </View>

                <View style={styles.macroSummaryBox}>
                  <Text style={styles.macroSummaryVal}>{carbsTarget}g</Text>
                  <Text style={styles.macroSummaryLabel}>Carbohidratos</Text>
                  <View style={[styles.macroBar, { backgroundColor: '#60A5FA' }]} />
                </View>

                <View style={styles.macroSummaryBox}>
                  <Text style={styles.macroSummaryVal}>{fatTarget}g</Text>
                  <Text style={styles.macroSummaryLabel}>Grasas</Text>
                  <View style={[styles.macroBar, { backgroundColor: '#93C5FD' }]} />
                </View>
              </View>
            </View>

            {/* Generated Routines Preview */}
            <View style={styles.routinesPreviewSection}>
              <Text style={styles.resultCardHeader}>RUTINAS GENERADAS PARA TI ({generatedRoutines.length})</Text>

              {generatedRoutines.map((routine, idx) => (
                <View key={idx} style={styles.routinePreviewCard}>
                  <View style={styles.routinePreviewTop}>
                    <Text style={styles.routinePreviewTitle}>{routine.name}</Text>
                    <View style={styles.routineDaysPill}>
                      <Text style={styles.routineDaysPillText}>
                        {routine.assigned_days.join(', ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.routinePreviewDesc}>{routine.description}</Text>

                  <View style={styles.routineExercisesMiniList}>
                    {routine.exercises.map((ex, eIdx) => (
                      <View key={eIdx} style={styles.routineExMiniItem}>
                        <Text style={styles.routineExMiniDot}>•</Text>
                        <Text style={styles.routineExMiniName} numberOfLines={1}>
                          {ex.name}
                        </Text>
                        <Text style={styles.routineExMiniSets}>
                          {ex.target_sets} × {ex.target_reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Action Button ── */}
      <View style={styles.bottomBar}>
        {currentStep < 5 ? (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>CONTINUAR</Text>
            <ChevronRight color="#FFFFFF" size={18} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.finishBtn, saving && styles.finishBtnDisabled]}
            onPress={handleFinishOnboarding}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <>
                <Text style={styles.finishBtnText}>COMENZAR MI PLAN</Text>
                <Zap color="#000000" size={18} fill="#000000" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 16,
    backgroundColor: '#0C0F17',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  stepperHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperStepText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  progressSegmentsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressSegmentActive: {
    backgroundColor: '#38BDF8',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  stepBox: {
    gap: 20,
  },
  stepTitleBox: {
    gap: 6,
    marginBottom: 4,
  },
  stepBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  stepSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    lineHeight: 20,
  },
  inputCard: {
    backgroundColor: '#121622',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#0C0F17',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#0C0F17',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  toggleBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleBtnTextActive: {
    color: '#38BDF8',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  unitInputBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#0C0F17',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  unitInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    padding: 0,
  },
  unitText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0F17',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  optionCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: '#38BDF8',
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTitleActive: {
    color: '#38BDF8',
  },
  optionDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  levelCard: {
    backgroundColor: '#121622',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  levelCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: '#38BDF8',
  },
  levelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  levelTitleActive: {
    color: '#38BDF8',
  },
  levelTime: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  levelDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  goalCard: {
    backgroundColor: '#121622',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  goalCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: '#38BDF8',
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  goalTitleActive: {
    color: '#38BDF8',
  },
  goalTagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  goalTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  goalDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  freqCard: {
    backgroundColor: '#121622',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  freqCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: '#38BDF8',
  },
  freqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  freqNumberBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0C0F17',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqNumberText: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
  },
  freqNumberSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '700',
  },
  freqTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  freqTitleActive: {
    color: '#38BDF8',
  },
  freqSplit: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  freqSchedule: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  freqDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  readyBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  summaryResultCard: {
    backgroundColor: '#121622',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    gap: 16,
  },
  resultCardHeader: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  caloriesBigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  caloriesBigNumber: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
  },
  caloriesBigUnit: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metaCalcsCol: {
    gap: 4,
    alignItems: 'flex-end',
  },
  metaCalcLine: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  macrosSummaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroSummaryBox: {
    flex: 1,
    backgroundColor: '#0C0F17',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  macroSummaryVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  macroSummaryLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
  },
  macroBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  routinesPreviewSection: {
    gap: 12,
    marginTop: 6,
  },
  routinePreviewCard: {
    backgroundColor: '#121622',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  routinePreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routinePreviewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  routineDaysPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  routineDaysPillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  routinePreviewDesc: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    lineHeight: 16,
  },
  routineExercisesMiniList: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 10,
    gap: 5,
    marginTop: 4,
  },
  routineExMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routineExMiniDot: {
    color: '#38BDF8',
    fontSize: 12,
  },
  routineExMiniName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    flex: 1,
  },
  routineExMiniSets: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    backgroundColor: '#0C0F17',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 15,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 15,
    gap: 8,
    shadowColor: '#38BDF8',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  finishBtnDisabled: {
    opacity: 0.7,
  },
  finishBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
})
