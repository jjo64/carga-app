import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native'
import Svg, { Path, Line, Circle, Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
import {
  Calendar as CalendarIcon,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
} from 'lucide-react-native'
import { NutritionDayStats } from '@/types'

interface NutritionEvolutionModalProps {
  visible: boolean
  onClose: () => void
  onSelectDate: (date: string) => void
  selectedDate: string
  history7Days: {
    days: NutritionDayStats[]
    avgCalories: number
    avgProtein: number
    avgCarbs: number
    avgFat: number
    netCaloriesBalance: number
    daysLoggedCount: number
    optimalDaysCount: number
  }
  history14Days: {
    days: NutritionDayStats[]
    avgCalories: number
    avgProtein: number
    avgCarbs: number
    avgFat: number
    netCaloriesBalance: number
    daysLoggedCount: number
    optimalDaysCount: number
  }
  history30Days: {
    days: NutritionDayStats[]
    avgCalories: number
    avgProtein: number
    avgCarbs: number
    avgFat: number
    netCaloriesBalance: number
    daysLoggedCount: number
    optimalDaysCount: number
  }
}

const SCREEN_WIDTH = Dimensions.get('window').width

export default function NutritionEvolutionModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  history7Days,
  history14Days,
  history30Days,
}: NutritionEvolutionModalProps) {
  const [rangeMode, setRangeMode] = useState<'7' | '14' | '30'>('7')

  const currentHistory =
    rangeMode === '7'
      ? history7Days
      : rangeMode === '14'
      ? history14Days
      : history30Days

  const days = currentHistory.days || []
  const targetCals = days[0]?.targetCalories || 2000

  // Preparar datos para el gráfico de líneas de calorías
  const chartWidth = Math.min(SCREEN_WIDTH - 48, 500)
  const chartHeight = 160
  const maxCals = Math.max(targetCals * 1.3, ...days.map((d) => d.calories || 0), 100)
  const minCals = 0

  const points = days.map((d, index) => {
    const x =
      days.length > 1
        ? (index / (days.length - 1)) * (chartWidth - 40) + 20
        : chartWidth / 2
    const yRatio = Math.min(1, (d.calories - minCals) / (maxCals - minCals))
    const y = chartHeight - 30 - yRatio * (chartHeight - 50)
    return { x, y, cals: d.calories, date: d.date, status: d.status, diff: d.caloriesDiff }
  })

  const targetY =
    chartHeight - 30 - Math.min(1, targetCals / (maxCals - minCals)) * (chartHeight - 50)

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : ''

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight - 30} L ${points[0].x.toFixed(1)} ${chartHeight - 30} Z`
      : ''

  const formatDateLabel = (dStr: string) => {
    try {
      const parts = dStr.split('-')
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
      }
    } catch {}
    return dStr.slice(5)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.headerBadge}>
                <TrendingUp size={14} color="#38BDF8" />
                <Text style={styles.headerBadgeText}>EVOLUCIÓN & ESTADÍSTICAS</Text>
              </View>
              <Text style={styles.headerTitle}>Seguimiento Nutricional</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          {/* Selector de Rango */}
          <View style={styles.rangeTabRow}>
            {(['7', '14', '30'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRangeMode(r)}
                style={[styles.rangeTab, rangeMode === r && styles.rangeTabActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.rangeTabText, rangeMode === r && styles.rangeTabTextActive]}>
                  {r === '7' ? '7 Días' : r === '14' ? '14 Días' : '30 Días'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Resumen de Métricas Generales */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PROMEDIO DIARIO</Text>
                <Text style={styles.statValue}>{currentHistory.avgCalories}</Text>
                <Text style={styles.statSub}>kcal / día (meta: {targetCals})</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>BALANCE NETO</Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        currentHistory.netCaloriesBalance > 0
                          ? '#F59E0B'
                          : currentHistory.netCaloriesBalance < 0
                          ? '#38BDF8'
                          : '#10B981',
                    },
                  ]}
                >
                  {currentHistory.netCaloriesBalance > 0
                    ? `+${currentHistory.netCaloriesBalance}`
                    : `${currentHistory.netCaloriesBalance}`}
                </Text>
                <Text style={styles.statSub}>
                  {currentHistory.netCaloriesBalance > 0
                    ? 'Superávit acumulado'
                    : currentHistory.netCaloriesBalance < 0
                    ? 'Déficit acumulado'
                    : 'En balance exacto'}
                </Text>
              </View>
            </View>

            {/* Promedios de Macros */}
            <View style={styles.macroAvgCard}>
              <Text style={styles.sectionSub}>PROMEDIOS DE MACROS REGISTRADOS</Text>
              <View style={styles.macroAvgGrid}>
                <View style={styles.macroAvgBox}>
                  <Text style={[styles.macroAvgVal, { color: '#38BDF8' }]}>
                    {currentHistory.avgProtein}g
                  </Text>
                  <Text style={styles.macroAvgLabel}>Proteína</Text>
                </View>
                <View style={styles.macroAvgBox}>
                  <Text style={[styles.macroAvgVal, { color: '#FBBF24' }]}>
                    {currentHistory.avgCarbs}g
                  </Text>
                  <Text style={styles.macroAvgLabel}>Carbos</Text>
                </View>
                <View style={styles.macroAvgBox}>
                  <Text style={[styles.macroAvgVal, { color: '#F472B6' }]}>
                    {currentHistory.avgFat}g
                  </Text>
                  <Text style={styles.macroAvgLabel}>Grasas</Text>
                </View>
                <View style={styles.macroAvgBox}>
                  <Text style={[styles.macroAvgVal, { color: '#10B981' }]}>
                    {currentHistory.optimalDaysCount}/{currentHistory.daysLoggedCount}
                  </Text>
                  <Text style={styles.macroAvgLabel}>Días Óptimos</Text>
                </View>
              </View>
            </View>

            {/* Gráfico de Evolución Calórica vs Objetivo */}
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Flame size={16} color="#38BDF8" />
                  <Text style={styles.chartTitle}>Evolución Calórica vs Meta</Text>
                </View>
                <View style={styles.targetLegend}>
                  <View style={styles.targetLegendDash} />
                  <Text style={styles.targetLegendText}>Meta: {targetCals} kcal</Text>
                </View>
              </View>

              <View style={{ width: chartWidth, height: chartHeight, alignSelf: 'center' }}>
                <Svg width={chartWidth} height={chartHeight}>
                  <Defs>
                    <LinearGradient id="calsGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                      <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                    </LinearGradient>
                  </Defs>

                  {/* Línea horizontal de Meta */}
                  <Line
                    x1="10"
                    y1={targetY}
                    x2={chartWidth - 10}
                    y2={targetY}
                    stroke="#F59E0B"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    opacity={0.8}
                  />

                  {/* Área y Línea de consumo */}
                  {areaPath ? <Path d={areaPath} fill="url(#calsGrad)" /> : null}
                  {linePath ? (
                    <Path
                      d={linePath}
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}

                  {/* Puntos y etiquetas */}
                  {points.map((p, i) => {
                    const isSelected = p.date === selectedDate
                    const isOver = p.diff > 200
                    const isUnder = p.diff < -300 && p.cals > 0
                    const dotColor = isOver ? '#EF4444' : isUnder ? '#F59E0B' : '#10B981'

                    return (
                      <React.Fragment key={i}>
                        <Circle
                          cx={p.x}
                          cy={p.y}
                          r={isSelected ? 6 : 4}
                          fill={p.cals > 0 ? dotColor : '#475569'}
                          stroke={isSelected ? '#FFFFFF' : '#0F172A'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                      </React.Fragment>
                    )
                  })}
                </Svg>
              </View>

              <View style={styles.chartFootRow}>
                <Text style={styles.chartFootText}>
                  {formatDateLabel(days[0]?.date || '')}
                </Text>
                <Text style={styles.chartFootText}>
                  {formatDateLabel(days[days.length - 1]?.date || '')}
                </Text>
              </View>
            </View>

            {/* Calendario / Lista Día por Día */}
            <View style={styles.calendarSection}>
              <View style={styles.sectionHeaderRow}>
                <CalendarIcon size={16} color="#38BDF8" />
                <Text style={styles.sectionTitle}>Historial Día por Día</Text>
              </View>
              <Text style={styles.sectionSubtext}>
                Toca cualquier día para inspeccionar o editar las comidas registradas.
              </Text>

              <View style={styles.daysList}>
                {days.map((day) => {
                  const isSelected = day.date === selectedDate
                  const isToday = day.date === new Date().toISOString().split('T')[0]
                  const hasLogs = day.mealCount > 0

                  return (
                    <TouchableOpacity
                      key={day.date}
                      style={[
                        styles.dayRowCard,
                        isSelected && styles.dayRowCardSelected,
                        !hasLogs && styles.dayRowCardEmpty,
                      ]}
                      onPress={() => {
                        onSelectDate(day.date)
                        onClose()
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dayRowLeft}>
                        <View
                          style={[
                            styles.dayStatusDot,
                            {
                              backgroundColor: !hasLogs
                                ? '#334155'
                                : day.status === 'optimal'
                                ? '#10B981'
                                : day.status === 'surplus'
                                ? '#EF4444'
                                : '#F59E0B',
                            },
                          ]}
                        />
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.dayRowDate,
                                isSelected && { color: '#38BDF8', fontWeight: '800' },
                              ]}
                            >
                              {formatDateLabel(day.date)}
                            </Text>
                            {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>HOY</Text></View>}
                          </View>
                          <Text style={styles.dayRowSub}>
                            {hasLogs ? `${day.mealCount} comidas registradas` : 'Sin registros'}
                          </Text>
                        </View>
                      </View>

                      {hasLogs ? (
                        <View style={styles.dayRowRight}>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.dayRowCals}>{day.calories} kcal</Text>
                            <Text
                              style={[
                                styles.dayRowDiff,
                                {
                                  color:
                                    day.caloriesDiff > 0
                                      ? '#F87171'
                                      : day.caloriesDiff < 0
                                      ? '#38BDF8'
                                      : '#10B981',
                                },
                              ]}
                            >
                              {day.caloriesDiff > 0
                                ? `+${day.caloriesDiff} superávit`
                                : `${day.caloriesDiff} déficit`}
                            </Text>
                          </View>
                          <View style={styles.dayMacrosPill}>
                            <Text style={styles.dayMacrosText}>
                              P{day.protein} · C{day.carbs} · G{day.fat}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.emptyDayText}>0 kcal</Text>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

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
    backgroundColor: '#0B0F19',
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
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  headerBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
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
  rangeTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  rangeTab: {
    flex: 1,
    backgroundColor: '#131B2E',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rangeTabActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  rangeTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  rangeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollBody: {
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  statSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  macroAvgCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  macroAvgGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroAvgBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  macroAvgVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  macroAvgLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  chartContainer: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  targetLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetLegendDash: {
    width: 14,
    height: 2,
    backgroundColor: '#F59E0B',
  },
  targetLegendText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  chartFootRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  chartFootText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  calendarSection: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtext: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
  },
  daysList: {
    gap: 8,
  },
  dayRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  dayRowCardSelected: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F2338',
  },
  dayRowCardEmpty: {
    opacity: 0.6,
  },
  dayRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayRowDate: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  todayBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  dayRowSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  dayRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dayRowCals: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dayRowDiff: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayMacrosPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayMacrosText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyDayText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
})
