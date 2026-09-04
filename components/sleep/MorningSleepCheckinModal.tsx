import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
  Clock,
  ChevronDown,
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

const ITEM_HEIGHT = 44
const VISIBLE_ITEMS = 5
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const calculateDurationMinutes = (startStr: string, endStr: string) => {
  const [sH, sM] = (startStr || '23:30').split(':').map((n) => parseInt(n, 10) || 0)
  const [eH, eM] = (endStr || '07:30').split(':').map((n) => parseInt(n, 10) || 0)
  let diff = eH * 60 + eM - (sH * 60 + sM)
  if (diff <= 0) {
    diff += 1440
  }
  return Math.max(60, Math.min(1080, diff))
}

/* ── Wheel Time Picker Mini-Modal ── */
interface WheelPickerProps {
  visible: boolean
  initialTime: string
  type: 'bedtime' | 'wakeTime'
  otherTime: string
  onClose: () => void
  onSelectTime: (time: string) => void
}

function WheelTimePickerModal({
  visible,
  initialTime,
  type,
  otherTime,
  onClose,
  onSelectTime,
}: WheelPickerProps) {
  const [selectedHour, setSelectedHour] = useState('23')
  const [selectedMinute, setSelectedMinute] = useState('30')

  const hourScrollRef = useRef<ScrollView>(null)
  const minuteScrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (visible && initialTime) {
      const [h, m] = initialTime.split(':')
      const validH = h ? h.padStart(2, '0') : '23'
      const validM = m ? m.padStart(2, '0') : '30'
      setSelectedHour(validH)
      setSelectedMinute(validM)

      const hIndex = HOURS.indexOf(validH)
      const mIndex = MINUTES.indexOf(validM)

      setTimeout(() => {
        if (hIndex >= 0) {
          hourScrollRef.current?.scrollTo({
            y: hIndex * ITEM_HEIGHT,
            animated: false,
          })
        }
        if (mIndex >= 0) {
          minuteScrollRef.current?.scrollTo({
            y: mIndex * ITEM_HEIGHT,
            animated: false,
          })
        }
      }, 100)
    }
  }, [visible, initialTime])

  const calculatePreviewDuration = () => {
    const currentStr = `${selectedHour}:${selectedMinute}`
    const startStr = type === 'bedtime' ? currentStr : otherTime
    const endStr = type === 'wakeTime' ? currentStr : otherTime

    const [sH, sM] = (startStr || '23:30').split(':').map((n) => parseInt(n, 10) || 0)
    const [eH, eM] = (endStr || '07:30').split(':').map((n) => parseInt(n, 10) || 0)

    let diff = eH * 60 + eM - (sH * 60 + sM)
    if (diff <= 0) {
      diff += 1440
    }
    const h = Math.floor(diff / 60)
    const m = diff % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const handleHourScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y
    const index = Math.round(offsetY / ITEM_HEIGHT)
    if (index >= 0 && index < HOURS.length) {
      setSelectedHour(HOURS[index])
    }
  }

  const handleMinuteScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y
    const index = Math.round(offsetY / ITEM_HEIGHT)
    if (index >= 0 && index < MINUTES.length) {
      setSelectedMinute(MINUTES[index])
    }
  }

  const handleSelectHour = (h: string, idx: number) => {
    setSelectedHour(h)
    hourScrollRef.current?.scrollTo({
      y: idx * ITEM_HEIGHT,
      animated: true,
    })
  }

  const handleSelectMinute = (m: string, idx: number) => {
    setSelectedMinute(m)
    minuteScrollRef.current?.scrollTo({
      y: idx * ITEM_HEIGHT,
      animated: true,
    })
  }

  const handleConfirm = () => {
    onSelectTime(`${selectedHour}:${selectedMinute}`)
    onClose()
  }

  const isBedtime = type === 'bedtime'

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={wheelStyles.overlay}>
        <View style={wheelStyles.card}>
          {/* Header */}
          <View style={wheelStyles.headerRow}>
            <View style={wheelStyles.headerLeft}>
              <View style={[wheelStyles.iconBox, isBedtime ? wheelStyles.iconBoxMoon : wheelStyles.iconBoxSun]}>
                {isBedtime ? (
                  <Moon size={18} color="#38BDF8" strokeWidth={2} />
                ) : (
                  <Sun size={18} color="#FBBF24" strokeWidth={2} />
                )}
              </View>
              <View>
                <Text style={wheelStyles.title}>
                  {isBedtime ? 'Hora de acostarse' : 'Hora de despertarse'}
                </Text>
                <Text style={wheelStyles.subtitle}>Formato 24hs · Rueda interactiva</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={wheelStyles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Time Display Badge */}
          <View style={wheelStyles.currentTimeBadge}>
            <Text style={wheelStyles.currentTimeText}>
              {selectedHour}:{selectedMinute}
            </Text>
            <Text style={wheelStyles.previewDurationText}>
              Total sueño resultante: <Text style={{ color: '#FAFAFA', fontWeight: '800' }}>{calculatePreviewDuration()}</Text>
            </Text>
          </View>

          {/* Wheel Selector Container */}
          <View style={wheelStyles.wheelWrapper}>
            {/* Center Selection Highlight Bar */}
            <View style={wheelStyles.selectionHighlight} pointerEvents="none" />

            {/* Column 1: Hours (00 - 23) */}
            <View style={wheelStyles.columnContainer}>
              <Text style={wheelStyles.columnHeaderLabel}>HORA (0-23)</Text>
              <ScrollView
                ref={hourScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleHourScroll}
                contentContainerStyle={wheelStyles.scrollContent}
              >
                <View style={{ height: ITEM_HEIGHT * 2 }} />
                {HOURS.map((h, idx) => {
                  const isSelected = selectedHour === h
                  return (
                    <TouchableOpacity
                      key={h}
                      style={wheelStyles.itemTouch}
                      onPress={() => handleSelectHour(h, idx)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          wheelStyles.itemText,
                          isSelected && wheelStyles.itemTextSelected,
                        ]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
                <View style={{ height: ITEM_HEIGHT * 2 }} />
              </ScrollView>
            </View>

            <Text style={wheelStyles.colonSeparator}>:</Text>

            {/* Column 2: Minutes (00 - 59) */}
            <View style={wheelStyles.columnContainer}>
              <Text style={wheelStyles.columnHeaderLabel}>MINUTOS (0-59)</Text>
              <ScrollView
                ref={minuteScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMinuteScroll}
                contentContainerStyle={wheelStyles.scrollContent}
              >
                <View style={{ height: ITEM_HEIGHT * 2 }} />
                {MINUTES.map((m, idx) => {
                  const isSelected = selectedMinute === m
                  return (
                    <TouchableOpacity
                      key={m}
                      style={wheelStyles.itemTouch}
                      onPress={() => handleSelectMinute(m, idx)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          wheelStyles.itemText,
                          isSelected && wheelStyles.itemTextSelected,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
                <View style={{ height: ITEM_HEIGHT * 2 }} />
              </ScrollView>
            </View>
          </View>

          {/* Quick Preset Buttons */}
          <View style={wheelStyles.presetRow}>
            {(isBedtime
              ? ['22:30', '23:00', '23:30', '00:00', '00:30']
              : ['06:30', '07:00', '07:30', '08:00', '08:30']
            ).map((preset) => {
              const [pH, pM] = preset.split(':')
              const isMatch = selectedHour === pH && selectedMinute === pM
              return (
                <TouchableOpacity
                  key={preset}
                  style={[wheelStyles.presetBtn, isMatch && wheelStyles.presetBtnActive]}
                  onPress={() => {
                    setSelectedHour(pH)
                    setSelectedMinute(pM)
                    const hIdx = HOURS.indexOf(pH)
                    const mIdx = MINUTES.indexOf(pM)
                    hourScrollRef.current?.scrollTo({ y: hIdx * ITEM_HEIGHT, animated: true })
                    minuteScrollRef.current?.scrollTo({ y: mIdx * ITEM_HEIGHT, animated: true })
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[wheelStyles.presetText, isMatch && wheelStyles.presetTextActive]}>
                    {preset}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Action Buttons */}
          <View style={wheelStyles.actionsRow}>
            <TouchableOpacity style={wheelStyles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={wheelStyles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={wheelStyles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Check size={16} color="#09090B" strokeWidth={2.5} />
              <Text style={wheelStyles.confirmBtnText}>Confirmar hora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

/* ── Main Morning Sleep Check-in Modal ── */
export default function MorningSleepCheckinModal({
  visible,
  estimated,
  onClose,
  onSave,
}: Props) {
  const [bedtime, setBedtime] = useState(estimated?.bedtime || '23:30')
  const [wakeTime, setWakeTime] = useState(estimated?.wakeTime || '07:30')
  const [qualityScore, setQualityScore] = useState(4)
  const [awakeningsCount, setAwakeningsCount] = useState(0)

  // State for opening the interactive wheel time picker
  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean
    type: 'bedtime' | 'wakeTime'
  }>({
    visible: false,
    type: 'bedtime',
  })

  useEffect(() => {
    if (estimated) {
      setBedtime(estimated.bedtime || '23:30')
      setWakeTime(estimated.wakeTime || '07:30')
    }
  }, [estimated])

  const durationMinutes = calculateDurationMinutes(bedtime, wakeTime)
  const phases = calculateSleepPhases(durationMinutes, qualityScore, awakeningsCount)

  const hours = Math.floor(durationMinutes / 60)
  const mins = durationMinutes % 60
  const durationBigFormatted = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`

  const handleOpenPicker = (type: 'bedtime' | 'wakeTime') => {
    setPickerConfig({
      visible: true,
      type,
    })
  }

  const handleSelectTime = (selectedTime: string) => {
    if (pickerConfig.type === 'bedtime') {
      setBedtime(selectedTime)
    } else {
      setWakeTime(selectedTime)
    }
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
    <>
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
              {/* Total Duration Card with Interactive Bedtime & WakeTime Pills */}
              <View style={styles.durationCard}>
                <View style={styles.timePillsRow}>
                  {/* Bedtime Pill */}
                  <TouchableOpacity
                    style={styles.timePillBtn}
                    onPress={() => handleOpenPicker('bedtime')}
                    activeOpacity={0.75}
                  >
                    <Moon size={14} color="#38BDF8" strokeWidth={2.2} />
                    <Text style={styles.timePillText}>{bedtime}</Text>
                    <ChevronDown size={13} color="#71717A" />
                  </TouchableOpacity>

                  <Text style={styles.arrowBetween}>➔</Text>

                  {/* WakeTime Pill */}
                  <TouchableOpacity
                    style={styles.timePillBtn}
                    onPress={() => handleOpenPicker('wakeTime')}
                    activeOpacity={0.75}
                  >
                    <Sun size={14} color="#FBBF24" strokeWidth={2.2} />
                    <Text style={styles.timePillText}>{wakeTime}</Text>
                    <ChevronDown size={13} color="#71717A" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.bigHoursText}>{durationBigFormatted}</Text>
                <Text style={styles.totalSleepLabel}>TIEMPO TOTAL DE SUEÑO</Text>
                <Text style={styles.tapToEditHint}>Toca las horas para cambiarlas con la rueda</Text>
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

      {/* Interactive 24h Wheel Time Picker Modal */}
      <WheelTimePickerModal
        visible={pickerConfig.visible}
        type={pickerConfig.type}
        initialTime={pickerConfig.type === 'bedtime' ? bedtime : wakeTime}
        otherTime={pickerConfig.type === 'bedtime' ? wakeTime : bedtime}
        onClose={() => setPickerConfig((prev) => ({ ...prev, visible: false }))}
        onSelectTime={handleSelectTime}
      />
    </>
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
  timePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  timePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  timePillText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  arrowBetween: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '700',
  },
  bigHoursText: {
    color: '#FAFAFA',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  totalSleepLabel: {
    color: '#71717A',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 4,
  },
  tapToEditHint: {
    color: 'rgba(113, 113, 122, 0.7)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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

const wheelStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#14151B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxMoon: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  iconBoxSun: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  title: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentTimeBadge: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  currentTimeText: {
    color: '#FAFAFA',
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  previewDurationText: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  wheelWrapper: {
    height: CONTAINER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#09090B',
    borderRadius: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#27272A',
    overflow: 'hidden',
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2 + 18,
    left: 10,
    right: 10,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  columnContainer: {
    flex: 1,
    height: CONTAINER_HEIGHT,
    alignItems: 'center',
  },
  columnHeaderLabel: {
    color: '#71717A',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
    paddingTop: 6,
    paddingBottom: 2,
  },
  colonSeparator: {
    color: '#FAFAFA',
    fontSize: 28,
    fontWeight: '900',
    paddingHorizontal: 8,
    marginTop: 18,
  },
  scrollContent: {
    alignItems: 'center',
  },
  itemTouch: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  itemText: {
    color: '#52525B',
    fontSize: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  itemTextSelected: {
    color: '#FAFAFA',
    fontSize: 24,
    fontWeight: '900',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 14,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  presetBtnActive: {
    backgroundColor: '#27272A',
    borderColor: '#FAFAFA',
  },
  presetText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  presetTextActive: {
    color: '#FAFAFA',
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  cancelBtnText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1.3,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '900',
  },
})
