import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import {
  Sparkles,
  Zap,
  Moon,
  Footprints,
  Brain,
  Dumbbell,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native'
import Svg, { Circle } from 'react-native-svg'
import { ReadinessEvaluation } from '@/lib/services/readinessService'
import { SleepRecord } from '@/lib/services/sleepService'
import { DailyStepsRecord } from '@/lib/services/stepService'

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
  const { score, status, title, message, actionTip, cnsRecoveryPct, muscularRecoveryPct } = readiness

  const strokeColor = status === 'optimal' ? '#10B981' : status === 'moderate' ? '#F59E0B' : '#EF4444'
  const size = 68
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (circumference * score) / 100

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusDot, { backgroundColor: strokeColor }]} />
          <Text style={styles.headerSub}>AI READINESS & RECUPERACIÓN</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            status === 'optimal'
              ? styles.statusPillOptimal
              : status === 'moderate'
              ? styles.statusPillModerate
              : styles.statusPillFatigued,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              status === 'optimal'
                ? { color: '#10B981' }
                : status === 'moderate'
                ? { color: '#F59E0B' }
                : { color: '#EF4444' },
            ]}
          >
            {status === 'optimal' ? '⚡ PR READY' : status === 'moderate' ? 'ESTABLE' : '⚠️ DESCARGA'}
          </Text>
        </View>
      </View>

      {/* Main Score & Title Row */}
      <View style={styles.mainRow}>
        {/* Circular Gauge */}
        <View style={styles.gaugeBox}>
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.gaugeTextCenter}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scorePercent}>%</Text>
          </View>
        </View>

        {/* Title and Message */}
        <View style={styles.titleCol}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardMessage} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </View>

      {/* Action Tip Banner */}
      <View style={styles.tipBanner}>
        <Sparkles size={14} color="#38BDF8" />
        <Text style={styles.tipText} numberOfLines={2}>
          <Text style={{ fontWeight: '800', color: '#38BDF8' }}>Coach IA: </Text>
          {actionTip}
        </Text>
      </View>

      {/* Biomarkers Grid: SNC, Muscular, Sueño, Pasos */}
      <View style={styles.biomarkersGrid}>
        {/* CNS Recovery */}
        <View style={styles.biomarkerCard}>
          <View style={styles.biomarkerTop}>
            <Brain size={13} color="#A855F7" />
            <Text style={styles.biomarkerName}>SNC (Nervioso)</Text>
          </View>
          <Text style={[styles.biomarkerVal, { color: '#A855F7' }]}>{cnsRecoveryPct}%</Text>
          <View style={styles.miniProgressBar}>
            <View
              style={[
                styles.miniProgressFill,
                { width: `${cnsRecoveryPct}%`, backgroundColor: '#A855F7' },
              ]}
            />
          </View>
        </View>

        {/* Muscular Recovery */}
        <View style={styles.biomarkerCard}>
          <View style={styles.biomarkerTop}>
            <Zap size={13} color="#38BDF8" />
            <Text style={styles.biomarkerName}>Muscular (GH)</Text>
          </View>
          <Text style={[styles.biomarkerVal, { color: '#38BDF8' }]}>{muscularRecoveryPct}%</Text>
          <View style={styles.miniProgressBar}>
            <View
              style={[
                styles.miniProgressFill,
                { width: `${muscularRecoveryPct}%`, backgroundColor: '#38BDF8' },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Interactive Quick Links: Sleep & Steps */}
      <View style={styles.quickLinksRow}>
        {/* Sleep Link */}
        <TouchableOpacity
          style={styles.quickLinkBtn}
          onPress={onOpenSleepModal}
          activeOpacity={0.8}
        >
          <Moon size={14} color="#38BDF8" />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.quickLinkLabel}>
              {todaySleep
                ? `${Math.floor(todaySleep.durationMinutes / 60)}h ${
                    todaySleep.durationMinutes % 60
                  }m dormidas`
                : 'Registrar sueño'}
            </Text>
            <Text style={styles.quickLinkSub}>
              {todaySleep ? `Calidad: ${todaySleep.qualityScore}/5 ★` : 'Toca para check-in'}
            </Text>
          </View>
          <ChevronRight size={13} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* Steps Link */}
        <TouchableOpacity
          style={styles.quickLinkBtn}
          onPress={onOpenStepsModal || onOpenSleepModal}
          activeOpacity={0.8}
        >
          <Footprints size={14} color="#FBBF24" />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.quickLinkLabel}>
              {todaySteps ? `${todaySteps.steps.toLocaleString('es-ES')} pasos` : '0 pasos'}
            </Text>
            <Text style={styles.quickLinkSub}>
              {todaySteps ? `+${todaySteps.caloriesBurned} kcal quemadas` : 'Podómetro activo'}
            </Text>
          </View>
          <ChevronRight size={13} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0E121B',
    borderRadius: 24,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillOptimal: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusPillModerate: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusPillFatigued: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  gaugeBox: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gaugeTextCenter: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  scorePercent: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
  },
  titleCol: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  cardMessage: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 16,
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.18)',
  },
  tipText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11.5,
    lineHeight: 16,
  },
  biomarkersGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  biomarkerCard: {
    flex: 1,
    backgroundColor: '#141824',
    borderRadius: 12,
    padding: 10,
  },
  biomarkerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  biomarkerName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10.5,
    fontWeight: '700',
  },
  biomarkerVal: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  miniProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141824',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  quickLinkLabel: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  quickLinkSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9.5,
    marginTop: 1,
  },
})
