import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { ReadinessEvaluation } from '@/lib/services/readinessService'
import { SleepRecord } from '@/lib/services/sleepService'
import { DailyStepsRecord } from '@/lib/services/stepService'
import { typography } from '@/constants/typography'

interface Props {
  readiness: ReadinessEvaluation
  todaySleep?: SleepRecord | null
  todaySteps?: DailyStepsRecord
  onOpenSleepModal: () => void
  onOpenStepsModal?: () => void
}

export default function ReadinessScoreCard({
  readiness,
  todaySleep,
  todaySteps,
  onOpenSleepModal,
  onOpenStepsModal,
}: Props) {
  const { score, status, cnsRecoveryPct, muscularRecoveryPct } = readiness

  const statusLabel =
    status === 'optimal'
      ? 'Óptimo'
      : status === 'moderate'
      ? 'Moderado'
      : 'Descarga necesaria'

  const statusColor =
    status === 'optimal' ? '#10B981' : status === 'moderate' ? '#F59E0B' : '#EF4444'

  const hasSleepLogged = Boolean(todaySleep)
  const avgRecoveryPct = Math.round((cnsRecoveryPct + muscularRecoveryPct) / 2)

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onOpenSleepModal}
    >
      {/* Header: Title + Chevron */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Readiness</Text>
        <ChevronRight size={16} color="#71717A" />
      </View>

      {/* Main Content: Hero Metric on Left + Badges on Right */}
      <View style={styles.mainRow}>
        {/* Left Side: 85% + Óptimo */}
        <View style={styles.scoreCol}>
          <Text style={styles.heroMetric}>{score}%</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.subStatusText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Right Side: Chips & Badges */}
        <View style={styles.badgesCol}>
          {/* Row 1: Sueño & HRV */}
          <View style={styles.pillsRow}>
            <TouchableOpacity
              style={styles.pillBadge}
              onPress={onOpenSleepModal}
              activeOpacity={0.7}
            >
              <Text style={styles.badgeText}>
                Sueño {hasSleepLogged ? '✓' : '+'}
              </Text>
            </TouchableOpacity>

            <View style={styles.pillBadge}>
              <Text style={styles.badgeText}>HRV ✓</Text>
            </View>
          </View>

          {/* Row 2: Recuperación: 90% */}
          <View style={styles.recoveryBadge}>
            <Text style={styles.badgeText}>
              Recuperación: {avgRecoveryPct || score}%
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#18181B', // Zinc 900
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.readinessTitle,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreCol: {
    gap: 3,
  },
  heroMetric: {
    ...typography.heroMetric,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subStatusText: {
    ...typography.readinessSubStatus,
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pillBadge: {
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  recoveryBadge: {
    backgroundColor: '#18181B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  badgeText: {
    ...typography.badgeText,
  },
})
