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
import { Moon, Sparkles, Sun, Check, X, Clock, Zap, Brain, ShieldAlert } from 'lucide-react-native'
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

const QUALITY_EMOJIS = [
  { score: 1, label: 'Muy mal', emoji: '😫', color: '#EF4444' },
  { score: 2, label: 'Cansado', emoji: '🥱', color: '#F59E0B' },
  { score: 3, label: 'Normal', emoji: '😐', color: '#38BDF8' },
  { score: 4, label: 'Bien', emoji: '😊', color: '#10B981' },
  { score: 5, label: 'Excelente', emoji: '⚡', color: '#A855F7' },
]

export default function MorningSleepCheckinModal({
  visible,
  estimated,
  onClose,
  onSave,
}: Props) {
  const [bedtime, setBedtime] = useState(estimated?.bedtime || '23:30')
  const [wakeTime, setWakeTime] = useState(estimated?.wakeTime || '07:30')
  const [durationMinutes, setDurationMinutes] = useState(estimated?.durationMinutes || 480)
  const [qualityScore, setQualityScore] = useState(4)
  const [awakeningsCount, setAwakeningsCount] = useState(0)

  useEffect(() => {
    if (estimated) {
      setBedtime(estimated.bedtime)
      setWakeTime(estimated.wakeTime)
      setDurationMinutes(estimated.durationMinutes)
    }
  }, [estimated])

  const phases = calculateSleepPhases(durationMinutes, qualityScore, awakeningsCount)

  const hours = Math.floor(durationMinutes / 60)
  const mins = durationMinutes % 60

  const handleAdjustDuration = (deltaMins: number) => {
    setDurationMinutes((prev) => Math.max(180, Math.min(720, prev + deltaMins)))
  }

  const handleConfirm = () => {
    onSave({
      bedtime,
      wakeTime,
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

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.moonIconBox}>
                <Moon size={18} color="#38BDF8" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Check-in de Sueño Matutino</Text>
                <Text style={styles.headerSub}>
                  {estimated ? 'Detectamos tu descanso aproximado' : 'Registra tu descanso de anoche'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            {/* Total Duration Card */}
            <View style={styles.durationCard}>
              <View style={styles.timeBadgeRow}>
                <View style={styles.timeBadge}>
                  <Moon size={13} color="#94A3B8" />
                  <Text style={styles.timeBadgeText}>{bedtime}</Text>
                </View>
                <Text style={styles.arrowBetween}>➔</Text>
                <View style={styles.timeBadge}>
                  <Sun size={13} color="#FBBF24" />
                  <Text style={styles.timeBadgeText}>{wakeTime}</Text>
                </View>
              </View>

              <Text style={styles.bigHoursText}>
                {hours}h {mins > 0 ? `${mins}m` : ''}
              </Text>
              <Text style={styles.totalSleepLabel}>TIEMPO TOTAL DE SUEÑO</Text>

              {/* Adjust duration stepper buttons */}
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
              {QUALITY_EMOJIS.map((q) => {
                const isSelected = qualityScore === q.score
                return (
                  <TouchableOpacity
                    key={q.score}
                    style={[styles.qualityBtn, isSelected && styles.qualityBtnSelected]}
                    onPress={() => setQualityScore(q.score)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.qualityEmoji}>{q.emoji}</Text>
                    <Text style={[styles.qualityText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                      {q.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Awakenings Selector */}
            <Text style={styles.sectionLabel}>DESPERTARES NOCTURNOS</Text>
            <View style={styles.awakeningsRow}>
              {[
                { val: 0, label: 'Ninguno (0)' },
                { val: 1, label: '1 vez' },
                { val: 2, label: '2 veces' },
                { val: 3, label: '3 o más' },
              ].map((a) => {
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
              <View style={styles.phasesHeader}>
                <Sparkles size={14} color="#38BDF8" />
                <Text style={styles.phasesTitle}>ESTIMACIÓN DE FASES DE RECUPERACIÓN</Text>
              </View>

              <View style={styles.phasesGrid}>
                {/* Deep Sleep */}
                <View style={styles.phaseItem}>
                  <View style={styles.phaseIconRow}>
                    <Zap size={14} color="#38BDF8" />
                    <Text style={styles.phaseItemName}>Profundo</Text>
                  </View>
                  <Text style={[styles.phaseMinutes, { color: '#38BDF8' }]}>
                    {Math.floor(phases.deep / 60)}h {phases.deep % 60}m
                  </Text>
                  <Text style={styles.phaseDetail}>Reparación muscular (GH)</Text>
                </View>

                {/* REM Sleep */}
                <View style={styles.phaseItem}>
                  <View style={styles.phaseIconRow}>
                    <Brain size={14} color="#A855F7" />
                    <Text style={styles.phaseItemName}>REM</Text>
                  </View>
                  <Text style={[styles.phaseMinutes, { color: '#A855F7' }]}>
                    {Math.floor(phases.rem / 60)}h {phases.rem % 60}m
                  </Text>
                  <Text style={styles.phaseDetail}>Recuperación del SNC</Text>
                </View>

                {/* Light Sleep */}
                <View style={styles.phaseItem}>
                  <View style={styles.phaseIconRow}>
                    <Clock size={14} color="#94A3B8" />
                    <Text style={styles.phaseItemName}>Ligero</Text>
                  </View>
                  <Text style={[styles.phaseMinutes, { color: '#94A3B8' }]}>
                    {Math.floor(phases.light / 60)}h {phases.light % 60}m
                  </Text>
                  <Text style={styles.phaseDetail}>Descanso basal</Text>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Check size={18} color="#0F172A" strokeWidth={3} />
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F131D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  moonIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexGrow: 0,
  },
  durationCard: {
    backgroundColor: '#161B28',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  arrowBetween: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  bigHoursText: {
    color: '#38BDF8',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  totalSleepLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  qualityBtn: {
    flex: 1,
    backgroundColor: '#161B28',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  qualityBtnSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  qualityEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  qualityText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  awakeningsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  awakeningPill: {
    flex: 1,
    backgroundColor: '#161B28',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  awakeningPillSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  awakeningPillText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11.5,
    fontWeight: '700',
  },
  awakeningPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  phasesCard: {
    backgroundColor: '#161B28',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  phasesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  phasesTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  phasesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseItem: {
    flex: 1,
    backgroundColor: '#0F131D',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  phaseIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  phaseItemName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
  },
  phaseMinutes: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  phaseDetail: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    textAlign: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 1,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
})
