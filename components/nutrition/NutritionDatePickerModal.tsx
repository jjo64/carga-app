import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native'
import { typography } from '@/constants/typography'

interface Props {
  visible: boolean
  selectedDate: string // YYYY-MM-DD
  onClose: () => void
  onSelectDate: (date: string) => void
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function NutritionDatePickerModal({
  visible,
  selectedDate,
  onClose,
  onSelectDate,
}: Props) {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date()
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear())
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()) // 0-11
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  // Calculate days in the current view month
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()

  // Monday = 0, Sunday = 6
  let startDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startDayOfWeek === -1) startDayOfWeek = 6

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((prev) => prev - 1)
    } else {
      setViewMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((prev) => prev + 1)
    } else {
      setViewMonth((prev) => prev + 1)
    }
  }

  const handleSelectDay = (day: number) => {
    const monthFormatted = String(viewMonth + 1).padStart(2, '0')
    const dayFormatted = String(day).padStart(2, '0')
    const dateStr = `${viewYear}-${monthFormatted}-${dayFormatted}`
    onSelectDate(dateStr)
    onClose()
  }

  const handleSelectToday = () => {
    onSelectDate(todayStr)
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    onClose()
  }

  const handlePickMonth = (monthIdx: number) => {
    setViewMonth(monthIdx)
    setShowMonthPicker(false)
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarIcon size={18} color="#FAFAFA" />
              <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Month & Year Bar */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
              <ChevronLeft size={18} color="#FAFAFA" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowMonthPicker((prev) => !prev)}
              style={styles.monthTitleBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.monthTitleText}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Text style={styles.monthToggleHint}>
                {showMonthPicker ? '▲ Días' : '▼ Meses'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
              <ChevronRight size={18} color="#FAFAFA" />
            </TouchableOpacity>
          </View>

          {/* Body: Month Picker Grid or Calendar Days Grid */}
          {showMonthPicker ? (
            <View style={styles.monthsGrid}>
              {MONTH_NAMES.map((name, idx) => {
                const isCurrent = idx === viewMonth
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.monthItemBtn, isCurrent && styles.monthItemBtnActive]}
                    onPress={() => handlePickMonth(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.monthItemText, isCurrent && styles.monthItemTextActive]}>
                      {name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : (
            <View style={styles.calendarContainer}>
              {/* Day Labels Row */}
              <View style={styles.dayLabelsRow}>
                {DAY_LABELS.map((lbl, idx) => (
                  <Text key={idx} style={styles.dayLabelText}>
                    {lbl}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {/* Empty leading cells */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.dayCellEmpty} />
                ))}

                {/* Day numbers */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const monthFormatted = String(viewMonth + 1).padStart(2, '0')
                  const dayFormatted = String(day).padStart(2, '0')
                  const dateStr = `${viewYear}-${monthFormatted}-${dayFormatted}`

                  const isSelected = dateStr === selectedDate
                  const isToday = dateStr === todayStr

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        isToday && !isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => handleSelectDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayCellText,
                          isSelected && styles.dayCellTextSelected,
                          isToday && !isSelected && styles.dayCellTextToday,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          {/* Quick "Hoy" Button */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={handleSelectToday}
              activeOpacity={0.8}
            >
              <Text style={styles.todayBtnText}>Ir a Hoy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#18181B', // Zinc 900
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A', // Zinc 800
    padding: 20,
    width: '100%',
    maxWidth: 380,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: '#FAFAFA',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#27272A',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleBtn: {
    alignItems: 'center',
    gap: 2,
  },
  monthTitleText: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  monthToggleHint: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '600',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  monthItemBtn: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#27272A',
    alignItems: 'center',
  },
  monthItemBtnActive: {
    backgroundColor: '#FAFAFA',
  },
  monthItemText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '600',
  },
  monthItemTextActive: {
    color: '#09090B',
    fontWeight: '800',
  },
  calendarContainer: {
    gap: 10,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayLabelText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 8,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#FAFAFA',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  dayCellText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '500',
  },
  dayCellTextSelected: {
    color: '#09090B',
    fontWeight: '800',
  },
  dayCellTextToday: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 4,
  },
  todayBtn: {
    backgroundColor: '#27272A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  todayBtnText: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '700',
  },
})
