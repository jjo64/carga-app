import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native'
import {
  HeartPulse,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldCheck,
  Apple,
  Info,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react-native'
import { NutritionDayStats, FoodLog } from '@/types'
import { HEALTH_REFERENCES } from '@/lib/services/nutritionStatsService'
import { aiService } from '@/lib/services/ai'
import { NutritionHealthAuditResult } from '@/lib/services/ai/types'

interface NutritionHealthAuditModalProps {
  visible: boolean
  onClose: () => void
  dayStats: NutritionDayStats
  logs: FoodLog[]
}

export default function NutritionHealthAuditModal({
  visible,
  onClose,
  dayStats,
  logs,
}: NutritionHealthAuditModalProps) {
  const [loadingAi, setLoadingAi] = useState(false)
  const [auditResult, setAuditResult] = useState<NutritionHealthAuditResult | null>(null)

  const health = dayStats.healthMetrics
  const microsList = Object.values(health.micronutrientsMap || {})

  const handleRunAiAudit = async () => {
    setLoadingAi(true)
    try {
      const flatFoods = logs.flatMap((l) =>
        (l.foods_parsed || []).map((f) => ({
          name: f.name,
          quantityG: f.quantity_g,
          brand: f.brand,
          calories: f.calories,
          proteinG: f.protein_g,
          carbsG: f.carbs_g,
          fatG: f.fat_g,
        }))
      )

      const { data } = await aiService.auditNutritionHealth({
        dayStats: {
          date: dayStats.date,
          calories: dayStats.calories,
          targetCalories: dayStats.targetCalories,
          protein: dayStats.protein,
          targetProtein: dayStats.targetProtein,
          carbs: dayStats.carbs,
          targetCarbs: dayStats.targetCarbs,
          fat: dayStats.fat,
          targetFat: dayStats.targetFat,
          healthMetrics: dayStats.healthMetrics,
        },
        foodsList: flatFoods,
      })

      setAuditResult(data)
    } catch (err) {
      console.warn('[NutritionHealthAuditModal] Error auditing nutrition:', err)
    } finally {
      setLoadingAi(false)
    }
  }

  const saltLimit = HEALTH_REFERENCES.maxSaltG
  const saltPercent = Math.min(100, Math.round((health.saltG / saltLimit) * 100))
  const isSaltExceeded = health.saltG > saltLimit

  const sugarLimit = HEALTH_REFERENCES.maxSugarsG
  const sugarPercent = Math.min(100, Math.round((health.sugarsG / sugarLimit) * 100))
  const isSugarExceeded = health.sugarsG > sugarLimit

  const satFatLimit = HEALTH_REFERENCES.maxSaturatedFatG
  const satFatPercent = Math.min(100, Math.round((health.saturatedFatG / satFatLimit) * 100))
  const isSatFatExceeded = health.saturatedFatG > satFatLimit

  const fiberTarget = HEALTH_REFERENCES.minFiberG
  const fiberPercent = Math.min(100, Math.round((health.fiberG / fiberTarget) * 100))

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <HeartPulse size={14} color="#10B981" />
                <Text style={styles.badgeText}>CONTROL DE SALUD & MICRONUTRIENTES</Text>
              </View>
              <Text style={styles.title}>Auditoría Nutricional</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Banner Transparencia */}
            <View style={styles.transparencyBanner}>
              <Info size={15} color="#38BDF8" style={{ marginTop: 2 }} />
              <Text style={styles.transparencyText}>
                Control riguroso sin datos inventados: Los micronutrientes se extraen de tablas oficiales y escaneos de ingredientes. Si un producto no los especifica, se detecta la carencia y la IA te sugiere alimentos frescos para compensar.
              </Text>
            </View>

            {/* Medidores de Salud Cardiovascular y Metabólica */}
            <Text style={styles.sectionHeader}>INDICADORES CRÍTICOS DE SALUD</Text>
            <View style={styles.healthGrid}>
              {/* Sal & Sodio */}
              <View style={[styles.healthCard, isSaltExceeded && styles.healthCardWarning]}>
                <View style={styles.healthCardTop}>
                  <Text style={styles.healthCardTitle}>Sal / Sodio</Text>
                  <Text
                    style={[
                      styles.healthCardVal,
                      isSaltExceeded ? { color: '#EF4444' } : { color: '#FFFFFF' },
                    ]}
                  >
                    {health.saltG}g / {saltLimit}g
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${saltPercent}%`,
                        backgroundColor: isSaltExceeded ? '#EF4444' : '#10B981',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.healthCardFoot}>
                  {isSaltExceeded
                    ? `⚠️ Exceso OMS: +${(health.saltG - saltLimit).toFixed(1)}g (${health.sodiumMg} mg Na)`
                    : `✓ Dentro del límite OMS (${health.sodiumMg} mg Na)`}
                </Text>
              </View>

              {/* Azúcares */}
              <View style={[styles.healthCard, isSugarExceeded && styles.healthCardWarning]}>
                <View style={styles.healthCardTop}>
                  <Text style={styles.healthCardTitle}>Azúcares</Text>
                  <Text
                    style={[
                      styles.healthCardVal,
                      isSugarExceeded ? { color: '#EF4444' } : { color: '#FFFFFF' },
                    ]}
                  >
                    {health.sugarsG}g / {sugarLimit}g
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${sugarPercent}%`,
                        backgroundColor: isSugarExceeded ? '#EF4444' : '#F59E0B',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.healthCardFoot}>
                  {isSugarExceeded
                    ? `⚠️ Excede recomendación OMS (< ${sugarLimit}g)`
                    : `✓ Nivel controlado`}
                </Text>
              </View>

              {/* Grasas Saturadas */}
              <View style={[styles.healthCard, isSatFatExceeded && styles.healthCardWarning]}>
                <View style={styles.healthCardTop}>
                  <Text style={styles.healthCardTitle}>Grasas Saturadas</Text>
                  <Text
                    style={[
                      styles.healthCardVal,
                      isSatFatExceeded ? { color: '#EF4444' } : { color: '#FFFFFF' },
                    ]}
                  >
                    {health.saturatedFatG}g / {satFatLimit}g
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${satFatPercent}%`,
                        backgroundColor: isSatFatExceeded ? '#EF4444' : '#60A5FA',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.healthCardFoot}>
                  {isSatFatExceeded ? '⚠️ Moderar embutidos y fritos' : '✓ Balance lipídico saludable'}
                </Text>
              </View>

              {/* Fibra Dietética */}
              <View style={styles.healthCard}>
                <View style={styles.healthCardTop}>
                  <Text style={styles.healthCardTitle}>Fibra Dietética</Text>
                  <Text style={[styles.healthCardVal, { color: '#10B981' }]}>
                    {health.fiberG}g / {fiberTarget}g
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${fiberPercent}%`, backgroundColor: '#10B981' },
                    ]}
                  />
                </View>
                <Text style={styles.healthCardFoot}>
                  {fiberPercent >= 100
                    ? '✓ Meta óptima de salud digestiva'
                    : `Faltan ${(fiberTarget - health.fiberG).toFixed(1)}g para la meta`}
                </Text>
              </View>
            </View>

            {/* Ratio Ultraprocesados */}
            <View style={styles.processedRatioCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.processedRatioTitle}>Nivel de Alimentos Ultraprocesados</Text>
                <Text style={styles.processedRatioSub}>
                  {health.ultraProcessedRatio === 0
                    ? '100% Alimentos naturales o mínimamente procesados'
                    : `${health.ultraProcessedRatio}% de los alimentos registrados son ultraprocesados`}
                </Text>
              </View>
              <View
                style={[
                  styles.processedBadge,
                  {
                    backgroundColor:
                      health.ultraProcessedRatio > 40
                        ? 'rgba(239,68,68,0.15)'
                        : health.ultraProcessedRatio > 20
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(16,185,129,0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.processedBadgeText,
                    {
                      color:
                        health.ultraProcessedRatio > 40
                          ? '#EF4444'
                          : health.ultraProcessedRatio > 20
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                >
                  {health.ultraProcessedRatio > 40
                    ? 'ALTO'
                    : health.ultraProcessedRatio > 20
                    ? 'MEDIO'
                    : 'LIMPIO'}
                </Text>
              </View>
            </View>

            {/* Lista de Micronutrientes (Vitaminas & Minerales) */}
            <View style={styles.microsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>VITAMINAS Y MINERALES REPORTADOS</Text>
                <Text style={styles.microsCountBadge}>{microsList.length} detectados</Text>
              </View>

              {microsList.length === 0 ? (
                <View style={styles.emptyMicrosBox}>
                  <Text style={styles.emptyMicrosText}>
                    Aún no hay micronutrientes específicos desglosados en los registros de hoy. La IA evaluará tus comidas para identificar posibles carencias.
                  </Text>
                </View>
              ) : (
                <View style={styles.microsGrid}>
                  {microsList.map((m, idx) => {
                    const pct = Math.min(100, m.vrnPercent || 0)
                    return (
                      <View key={idx} style={styles.microItemCard}>
                        <View style={styles.microItemTop}>
                          <Text style={styles.microItemName}>{m.name}</Text>
                          <Text style={styles.microItemAmount}>
                            {m.amount.toFixed(1)} {m.unit}
                          </Text>
                        </View>
                        <View style={styles.microProgressBarBg}>
                          <View
                            style={[
                              styles.microProgressBarFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: pct >= 80 ? '#10B981' : pct >= 40 ? '#38BDF8' : '#F59E0B',
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.microItemFoot}>{m.vrnPercent}% de VRN diario</Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>

            {/* Botón Acción: Auditoría con IA */}
            <TouchableOpacity
              style={styles.aiAuditBtn}
              onPress={handleRunAiAudit}
              disabled={loadingAi}
              activeOpacity={0.85}
            >
              {loadingAi ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <>
                  <Sparkles size={18} color="#0F172A" />
                  <Text style={styles.aiAuditBtnText}>
                    {auditResult ? 'VOLVER A AUDITAR CON IA' : 'AUDITAR SALUD CON IA'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Resultados del Diagnóstico IA */}
            {auditResult && (
              <View style={styles.auditResultContainer}>
                {/* Score Header */}
                <View style={styles.scoreCard}>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreNumber}>{auditResult.healthScore}</Text>
                    <Text style={styles.scoreMax}>/100</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scoreTitle}>Puntuación de Salud Nutricional</Text>
                    <Text style={styles.scoreVerdict}>{auditResult.overallSummary}</Text>
                  </View>
                </View>

                {/* Macro & Calorie Verdicts */}
                <View style={styles.verdictsCard}>
                  <Text style={styles.verdictItem}>
                    ⚖️ <Text style={{ fontWeight: 'bold' }}>Macros:</Text> {auditResult.macroBalanceVerdict}
                  </Text>
                  <Text style={styles.verdictItem}>
                    🔥 <Text style={{ fontWeight: 'bold' }}>Calorías:</Text> {auditResult.calorieAdherenceVerdict}
                  </Text>
                </View>

                {/* Alertas y Advertencias */}
                {auditResult.warnings && auditResult.warnings.length > 0 && (
                  <View style={styles.warningsSection}>
                    <Text style={styles.subSectionTitle}>ALERTAS DE SALUD DETECTADAS</Text>
                    {auditResult.warnings.map((w, i) => (
                      <View key={i} style={styles.warningItemBox}>
                        <AlertTriangle size={16} color="#F59E0B" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.warningItemTitle}>{w.title}</Text>
                          <Text style={styles.warningItemMessage}>{w.message}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Carencias y Nutrientes a Reforzar */}
                {auditResult.deficienciesAndNeeds && auditResult.deficienciesAndNeeds.length > 0 && (
                  <View style={styles.deficienciesSection}>
                    <Text style={styles.subSectionTitle}>NUTRIENTES Y VITAMINAS A REFORZAR</Text>
                    {auditResult.deficienciesAndNeeds.map((d, i) => (
                      <View key={i} style={styles.deficiencyCard}>
                        <View style={styles.deficiencyHeader}>
                          <Text style={styles.deficiencyName}>{d.nutrient}</Text>
                          <Text style={styles.deficiencyStatusTag}>
                            {d.status === 'critical_deficit'
                              ? 'Déficit Notorio'
                              : d.status === 'moderate_deficit'
                              ? 'Reforzar'
                              : 'Revisar'}
                          </Text>
                        </View>
                        <Text style={styles.deficiencyWhy}>{d.whyNeeded}</Text>
                        <View style={styles.foodSourcesRow}>
                          <Text style={styles.foodSourcesLabel}>Fuentes ideales:</Text>
                          <Text style={styles.foodSourcesText}>
                            {d.topFoodSources.join(', ')}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recomendaciones de Alimentos Reales */}
                {auditResult.foodRecommendations && auditResult.foodRecommendations.length > 0 && (
                  <View style={styles.recommendationsSection}>
                    <Text style={styles.subSectionTitle}>ALIMENTOS RECOMENDADOS PARA TI</Text>
                    {auditResult.foodRecommendations.map((rec, i) => (
                      <View key={i} style={styles.recFoodCard}>
                        <View style={styles.recFoodHeader}>
                          <Text style={styles.recFoodName}>{rec.food}</Text>
                          <Text style={styles.recFoodPortion}>{rec.portion}</Text>
                        </View>
                        <Text style={styles.recFoodBenefit}>{rec.benefit}</Text>
                        <View style={styles.recNutrientsRow}>
                          {rec.targetNutrients.map((nut, nIdx) => (
                            <View key={nIdx} style={styles.recNutrientPill}>
                              <Text style={styles.recNutrientText}>+ {nut}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Clean Eating Advice */}
                {auditResult.cleanEatingSummary && (
                  <View style={styles.cleanEatingCard}>
                    <ShieldCheck size={18} color="#10B981" />
                    <Text style={styles.cleanEatingText}>
                      {auditResult.cleanEatingSummary.advice}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0A0F1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  handle: {
    width: 38,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  transparencyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56,189,248,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  transparencyText: {
    flex: 1,
    color: '#BAE6FD',
    fontSize: 11.5,
    lineHeight: 16,
  },
  sectionHeader: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  healthGrid: {
    gap: 10,
    marginBottom: 14,
  },
  healthCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  healthCardWarning: {
    borderColor: 'rgba(239,68,68,0.35)',
    backgroundColor: '#1B131D',
  },
  healthCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  healthCardTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  healthCardVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  healthCardFoot: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 2,
  },
  processedRatioCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  processedRatioTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  processedRatioSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  processedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  processedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  microsSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  microsCountBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyMicrosBox: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyMicrosText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
  microsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  microItemCard: {
    width: '48.5%',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  microItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  microItemName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  microItemAmount: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  microProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 4,
  },
  microProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  microItemFoot: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
  },
  aiAuditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#38BDF8',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  aiAuditBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  auditResultContainer: {
    gap: 14,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F2942',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#38BDF8',
  },
  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  scoreMax: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  scoreTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreVerdict: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  verdictsCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  verdictItem: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 17,
  },
  subSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  warningsSection: {
    gap: 8,
  },
  warningItemBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 12,
    padding: 12,
  },
  warningItemTitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  warningItemMessage: {
    color: '#CBD5E1',
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  deficienciesSection: {
    gap: 8,
  },
  deficiencyCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  deficiencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deficiencyName: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  deficiencyStatusTag: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deficiencyWhy: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 6,
  },
  foodSourcesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  foodSourcesLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
  },
  foodSourcesText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  recommendationsSection: {
    gap: 8,
  },
  recFoodCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.2)',
  },
  recFoodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recFoodName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  recFoodPortion: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  recFoodBenefit: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 8,
  },
  recNutrientsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recNutrientPill: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recNutrientText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  cleanEatingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  cleanEatingText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 17,
  },
})
