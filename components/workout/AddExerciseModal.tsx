import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search, X, ChevronDown, Info, Dumbbell, Check, Plus, Zap } from 'lucide-react-native'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import {
  searchExercises,
  CATEGORIES_LIST,
  EQUIPMENTS_LIST,
  ExerciseDefinition,
} from '@/constants/exerciseDatabase'
import { getExerciseRecordData } from '@/lib/hooks/useWorkout'
import { useLanguage } from '@/lib/i18n'

interface Props {
  visible: boolean
  onClose: () => void
  onSelectExercise?: (exercise: ExerciseDefinition) => void
  onAddExercises?: (exercises: ExerciseDefinition[]) => void
  onOpenInfo: (exercise: ExerciseDefinition) => void
}

export default function AddExerciseModal({
  visible,
  onClose,
  onSelectExercise,
  onAddExercises,
  onOpenInfo,
}: Props) {
  const insets = useSafeAreaInsets()
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos los Músculos')
  const [selectedEquipment, setSelectedEquipment] = useState('Todo el Equipamiento')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false)
  const [limit, setLimit] = useState(50)
  const [selectedExercises, setSelectedExercises] = useState<ExerciseDefinition[]>([])

  // Reset filters and selected cart every time the modal is opened
  useEffect(() => {
    if (visible) {
      setSearchQuery('')
      setSelectedCategory('Todos los Músculos')
      setSelectedEquipment('Todo el Equipamiento')
      setShowCategoryPicker(false)
      setShowEquipmentPicker(false)
      setSelectedExercises([])
      setLimit(50)
    }
  }, [visible])

  const filteredExercises = useMemo(() => {
    return searchExercises(searchQuery, selectedCategory, selectedEquipment, limit)
  }, [searchQuery, selectedCategory, selectedEquipment, limit])

  const isExerciseSelected = (id: string) => {
    return selectedExercises.some((ex) => ex.id === id)
  }

  const toggleExerciseSelection = (exercise: ExerciseDefinition) => {
    setSelectedExercises((prev) => {
      const exists = prev.some((ex) => ex.id === exercise.id)
      if (exists) {
        return prev.filter((ex) => ex.id !== exercise.id)
      } else {
        return [...prev, exercise]
      }
    })
  }

  const handleConfirmAdd = () => {
    if (selectedExercises.length > 0) {
      if (onAddExercises) {
        onAddExercises(selectedExercises)
      } else if (onSelectExercise) {
        selectedExercises.forEach((ex) => onSelectExercise(ex))
      }
    }
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <View style={styles.headerBadge}>
              <Zap size={11} color="#71717A" />
              <Text style={styles.headerBadgeText}>BIBLIOTECA DE EJERCICIOS</Text>
            </View>
            <Text style={styles.headerTitle}>Añadir Ejercicios</Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={18} color="#A1A1AA" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Search Input */}
          <View style={styles.searchBox}>
            <Search color="#71717A" size={18} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ejercicio o músculo..."
              placeholderTextColor="#52525B"
              value={searchQuery}
              onChangeText={(tText) => {
                setSearchQuery(tText)
                setLimit(50)
              }}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X color="#71717A" size={18} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills Row */}
          <View style={styles.filterRow}>
            {/* Category / Muscle Filter */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedCategory !== 'Todos los Músculos' && styles.filterPillActive,
              ]}
              onPress={() => {
                setShowCategoryPicker((prev) => !prev)
                setShowEquipmentPicker(false)
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedCategory !== 'Todos los Músculos' && styles.filterPillTextActive,
                ]}
                numberOfLines={1}
              >
                {selectedCategory}
              </Text>
              <ChevronDown color="#71717A" size={14} strokeWidth={2} />
            </TouchableOpacity>

            {/* Equipment Filter */}
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedEquipment !== 'Todo el Equipamiento' && styles.filterPillActive,
              ]}
              onPress={() => {
                setShowEquipmentPicker((prev) => !prev)
                setShowCategoryPicker(false)
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedEquipment !== 'Todo el Equipamiento' && styles.filterPillTextActive,
                ]}
                numberOfLines={1}
              >
                {selectedEquipment}
              </Text>
              <ChevronDown color="#71717A" size={14} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Category Dropdown */}
          {showCategoryPicker && (
            <View style={styles.filterDropdown}>
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                {CATEGORIES_LIST.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      setSelectedCategory(opt)
                      setShowCategoryPicker(false)
                    }}
                    style={[
                      styles.filterDropdownItem,
                      selectedCategory === opt && styles.filterDropdownItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterDropdownItemText,
                        selectedCategory === opt && styles.filterDropdownItemTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                    {selectedCategory === opt && (
                      <Check size={16} color="#FAFAFA" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Equipment Dropdown */}
          {showEquipmentPicker && (
            <View style={styles.filterDropdown}>
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                {EQUIPMENTS_LIST.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      setSelectedEquipment(opt)
                      setShowEquipmentPicker(false)
                    }}
                    style={[
                      styles.filterDropdownItem,
                      selectedEquipment === opt && styles.filterDropdownItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterDropdownItemText,
                        selectedEquipment === opt && styles.filterDropdownItemTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                    {selectedEquipment === opt && (
                      <Check size={16} color="#FAFAFA" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>
              {searchQuery ? `RESULTADOS (${filteredExercises.length})` : `EJERCICIOS DISPONIBLES (${filteredExercises.length})`}
            </Text>
            {selectedExercises.length > 0 && (
              <Text style={styles.sectionHeaderHint}>
                {selectedExercises.length} seleccionado{selectedExercises.length > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Exercises List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: selectedExercises.length > 0 ? insets.bottom + 90 : insets.bottom + 30 },
            ]}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
              if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 100) {
                setLimit((prev) => prev + 30)
              }
            }}
            scrollEventThrottle={400}
          >
            {filteredExercises.map((ex) => {
              const isSelected = isExerciseSelected(ex.id)
              const record = getExerciseRecordData(ex.name)
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[
                    styles.exerciseCard,
                    isSelected && styles.exerciseCardSelected,
                  ]}
                  onPress={() => toggleExerciseSelection(ex)}
                  activeOpacity={0.75}
                >
                  <View style={styles.exerciseThumbBox}>
                    <ExerciseIllustration
                      exerciseId={ex.id}
                      exerciseName={ex.name}
                      imageUrl={ex.imageUrl}
                      gifUrl={ex.gifUrl}
                      size={46}
                      variant="circle-thumb"
                    />
                  </View>

                  <View style={styles.exerciseInfo}>
                    <Text
                      style={[
                        styles.exerciseName,
                        isSelected && { color: '#FAFAFA' },
                      ]}
                      numberOfLines={1}
                    >
                      {ex.name}
                    </Text>
                    <View style={styles.exerciseSubRow}>
                      <Text style={styles.exerciseMuscle} numberOfLines={1}>
                        {ex.category || ex.muscleGroup} · {ex.equipment}
                      </Text>
                      {record.maxWeightOverall > 0 && (
                        <View style={styles.prBadge}>
                          <Text style={styles.prBadgeText}>PR: {record.maxWeightOverall}kg</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* (i) Info Button */}
                  <TouchableOpacity
                    style={styles.infoBtn}
                    onPress={(e) => {
                      e.stopPropagation?.()
                      onOpenInfo(ex)
                    }}
                    activeOpacity={0.7}
                  >
                    <Info color="#71717A" size={18} strokeWidth={2} />
                  </TouchableOpacity>

                  {/* Multi-select check / add button */}
                  <View
                    style={[
                      styles.checkCircle,
                      isSelected && styles.checkCircleSelected,
                    ]}
                  >
                    {isSelected ? (
                      <Check size={14} color="#09090B" strokeWidth={3} />
                    ) : (
                      <Plus size={14} color="#A1A1AA" strokeWidth={2.5} />
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}

            {filteredExercises.length === 0 && (
              <View style={styles.emptyBox}>
                <Dumbbell color="#52525B" size={32} strokeWidth={1.5} />
                <Text style={styles.emptyText}>No se encontraron ejercicios</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Floating Bottom Cart Bar */}
        {selectedExercises.length > 0 && (
          <View style={[styles.floatingCartBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={styles.cartConfirmBtn}
              onPress={handleConfirmAdd}
              activeOpacity={0.85}
            >
              <Check size={18} color="#09090B" strokeWidth={2.5} />
              <Text style={styles.cartConfirmBtnText}>
                AÑADIR ({selectedExercises.length} SELECCIONADO{selectedExercises.length > 1 ? 'S' : ''})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  headerTitleCol: {
    gap: 4,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerBadgeText: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  searchInput: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  filterPillActive: {
    borderColor: '#52525B',
    backgroundColor: '#27272A',
  },
  filterPillText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  filterPillTextActive: {
    color: '#FAFAFA',
    fontWeight: '700',
  },
  filterDropdown: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: '#27272A',
    maxHeight: 240,
    position: 'absolute',
    top: 115,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 25,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterDropdownItemActive: {
    backgroundColor: '#27272A',
  },
  filterDropdownItemText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '500',
  },
  filterDropdownItemTextActive: {
    color: '#FAFAFA',
    fontWeight: '800',
  },
  sectionHeaderRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeader: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionHeaderHint: {
    color: '#FAFAFA',
    fontSize: 11,
    fontWeight: '700',
  },
  listContainer: {
    gap: 8,
    paddingBottom: 40,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121214',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
  },
  exerciseCardSelected: {
    backgroundColor: '#18181B',
    borderColor: '#52525B',
  },
  exerciseThumbBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exerciseInfo: {
    flex: 1,
    gap: 3,
  },
  exerciseName: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '800',
  },
  exerciseSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseMuscle: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
  },
  prBadge: {
    backgroundColor: '#27272A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  prBadgeText: {
    color: '#A1A1AA',
    fontSize: 9,
    fontWeight: '800',
  },
  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#FAFAFA',
    borderColor: '#FAFAFA',
  },
  infoBtn: {
    padding: 6,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#09090B',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#18181B',
  },
  cartConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
  },
  cartConfirmBtnText: {
    color: '#09090B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
})
