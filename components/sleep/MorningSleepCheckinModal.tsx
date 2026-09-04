import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native'
import {
  Moon,
  Sun,
  Check,
  X,
  Frown,
  Meh,
  MinusCircle,
  Smile,
  Star,
} from 'lucide-react-native'
import { calculateSleepPhases, EstimatedNightSleep } from '@/lib/services/sleepService'

interface Props {
  visible: boolean
  estimated?: EstimatedNightSleep | null
  onClose: () => void
  onSave: (data: {
    bedtime: string
    wakeTime: string
    durationMinutes: number
    qualityScore: number
    awakeningsCount: number
    deepSleepMinutes: number
    remSleepMinutes: number
  }) => void
}

const QUALITY_OPTIONS = [
  { score: 1, label: 'Muy mal', icon: Frown },
  { score: 2, label: 'Cansado', icon: Meh },
  { score: 3, label: 'Normal', icon: MinusCircle },
  { score: 4, label: 'Bien', icon: Smile },
  { score: 5, label: 'Excelente', icon: Star },
]

const AWAKENINGS_OPTIONS = [
  { val: 0, label: 'Ninguno (0)' },
  { val: 1, label: '1 vez' },
  { val: 2, label: '2 veces' },
  { val: 3, label: '3 o más' },
]

const computeWakeTime = (bedtimeStr: string, totalMinutes: number) => {
  const [bH, bM] = (bedtimeStr || '23:30').split(':').map((n) => parseInt(n, 10) || 0)
  const totalM = bH * 60 + bM + totalMinutes
  const normalizedM = ((totalM % 1440) + 1440) % 1440
  const wH = Math.floor(normalizedM / 60)
  const wM = normalizedM % 60
  return `${String(wH).padStart(2, '0')}:${String(wM).padStart(2, '0')}`
}

export default function MorningSleepCheckinModal({
  visible,
  estimated,
  onClose,
  onSave,
}: Props) {
  const [bedtime, setBedtime] = useState(estimated?.bedtime || '23:30')
  const [durationMinutes, setDurationMinutes] = useState(estimated?.durationMinutes || 480)
  const [qualityScore, setQualityScore] = useState(4)
  const [awakeningsCount, setAwakeningsCount] = useState(0)

  useEffect(() => {
    if (estimated) {
      setBedtime(estimated.bedtime)
      setDurationMinutes(estimated.durationMinutes)
    }
  }, [estimated])

  const currentWakeTime = computeWakeTime(bedtime, durationMinutes)
  const phases = calculateSleepPhases(durationMinutes, qualityScore, awakeningsCount)

  const hours = Math.floor(durationMinutes / 60)
  const mins = durationMinutes % 60
  const durationBigFormatted = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`

  const handleAdjustDuration = (deltaMins: number) => {
    setDurationMinutes((prev) => Math.max(180, Math.min(720, prev + deltaMins)))
  }

  const handleConfirm = () => {
    onSave({
      bedtime,
      wakeTime: currentWakeTime,
      durationMinutes,
      qualityScore,
      awakeningsCount,
      deepSleepMinutes: phases.deep,
      remSleepMinutes: phases.rem,
    })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Top Crescent Icon & Close button */}
          <View style={styles.topHeader}>
            <View style={styles.topIconBox}>
              <Moon size={20} color="#71717A" strokeWidth={2} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.headerTitle}>Check-in de Sueño Matutino</Text>
          <Text style={styles.headerSub}>Registra tu descanso de anoche</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Total Duration Card */}
            <View style={styles.durationCard}>
              <View style={styles.timeBadgeRow}>
                <Moon size={15} color="#71717A" />
                <Text style={styles.timeBadgeText}>
                  {bedtime} → {currentWakeTime}
                </Text>
                <Sun size={15} color="#71717A" />
              </View>

              <Text style={styles.bigHoursText}>{durationBigFormatted}</Text>
              <Text style={styles.totalSleepLabel}>TIEMPO TOTAL DE SUEÑO</Text>

              {/* Adjust duration stepper pills */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleAdjustDuration(-30)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepBtnText}>-30 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleAdjustDuration(-15)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepBtnText}>-15 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleAdjustDuration(15)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepBtnText}>+15 min</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => handleAdjustDuration(30)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepBtnText}>+30 min</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quality Score Selector */}
            <Text style={styles.sectionLabel}>¿CÓMO TE SIENTES AL DESPERTAR?</Text>
            <View style={styles.qualityRow}>
              {QUALITY_OPTIONS.map((q) => {
                const isSelected = qualityScore === q.score
                const IconComp = q.icon
                return (
                  <TouchableOpacity
                    key={q.score}
                    style={[styles.qualityBtn, isSelected && styles.qualityBtnSelected]}
                    onPress={() => setQualityScore(q.score)}
                    activeOpacity={0.8}
                  >
                    <IconComp
                      size={24}
                      color={isSelected ? '#FAFAFA' : '#71717A'}
                      strokeWidth={1.8}
                    />
                    <Text style={[styles.qualityText, isSelected && styles.qualityTextSelected]}>
                      {q.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Awakenings Selector */}
            <Text style={styles.sectionLabel}>DESPERTARES NOCTURNOS</Text>
            <View style={styles.awakeningsRow}>
              {AWAKENINGS_OPTIONS.map((a) => {
                const isSelected = awakeningsCount === a.val
                return (
                  <TouchableOpacity
                    key={a.val}
                    style={[styles.awakeningPill, isSelected && styles.awakeningPillSelected]}
                    onPress={() => setAwakeningsCount(a.val)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.awakeningPillText,
                        isSelected && styles.awakeningPillTextSelected,
                      ]}
                    >
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Estimated Sleep Phases Breakdown Card */}
            <View style={styles.phasesCard}>
              <Text style={styles.phasesTitle}>ESTIMACIÓN DE FASES DE RECUPERACIÓN</Text>

              <View style={styles.phasesGrid}>
                {/* Deep Sleep */}
                <View style={[styles.phaseCol, styles.phaseColBorder]}>
                  <Text style={styles.phaseName}>Profundo</Text>
                  <Text style={styles.phaseTime}>
                    ({Math.floor(phases.deep / 60)}h {phases.deep % 60}m)
                  </Text>
                  <Text style={styles.phaseSub}>Reparación muscular (GH)</Text>
                </View>

                {/* REM Sleep */}
                <View style={[styles.phaseCol, styles.phaseColBorder]}>
                  <Text style={styles.phaseName}>REM</Text>
                  <Text style={styles.phaseTime}>
                    ({Math.floor(phases.rem / 60)}h {phases.rem % 60}m)
                  </Text>
                  <Text style={styles.phaseSub}>Recuperación del SNC</Text>
                </View>

                {/* Light Sleep */}
                <View style={styles.phaseCol}>
                  <Text style={styles.phaseName}>Ligero</Text>
                  <Text style={styles.phaseTime}>
                    ({Math.floor(phases.light / 60)}h {phases.light % 60}m)
                  </Text>
                  <Text style={styles.phaseSub}>Descanso basal</Text>
                </View>
              </View>
            </View>

            {/* Save Confirmation Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleConfirm} activeOpacity={0.88}>
              <Check size={17} color="#09090B" strokeWidth={2.5} />
              <Text style={styles.saveBtnText}>CONFIRMAR CHECK-IN DE SUEÑO</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>Omitir por hoy</Text>
            </TouchableOpacity>
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
    backgroundColor: '#09090B',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: '#27272A',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  topHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 36,
  },
  topIconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FAFAFA',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: -0.3,
  },
  headerSub: {
    color: '#71717A',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  durationCard: {
    backgroundColor: '#14151B',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  timeBadgeText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  bigHoursText: {
    color: '#FAFAFA',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  totalSleepLabel: {
    color: '#71717A',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  stepBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  stepBtnText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 22,
  },
  qualityBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  qualityBtnSelected: {
    borderColor: '#FAFAFA',
    backgroundColor: '#18181B',
  },
  qualityText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  qualityTextSelected: {
    color: '#FAFAFA',
    fontWeight: '800',
  },
  awakeningsRow: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 9999,
    padding: 3,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  awakeningPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  awakeningPillSelected: {
    backgroundColor: '#FAFAFA',
  },
  awakeningPillText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '700',
  },
  awakeningPillTextSelected: {
    color: '#09090B',
    fontWeight: '800',
  },
  phasesCard: {
    backgroundColor: '#14151B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  phasesTitle: {
    color: '#71717A',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 14,
    textAlign: 'center',
  },
  phasesGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  phaseCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  phaseColBorder: {
    borderRightWidth: 1,
    borderRightColor: '#27272A',
  },
  phaseName: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  phaseTime: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  phaseSub: {
    color: '#71717A',
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 13,
    fontWeight: '500',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  saveBtnText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  skipBtnText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
})
