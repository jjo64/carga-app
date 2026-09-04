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
import { Search, X, ChevronDown, Info, Dumbbell, Check, Plus, Layers } from 'lucide-react-native'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import {
  searchExercises,
  CATEGORIES_LIST,
  EQUIPMENTS_LIST,
  ExerciseDefinition,
} from '@/constants/exerciseDatabase'
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
      <View style={styles.container}>
        {/* Top Header */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.topBarActionBtn}>
            <Text style={styles.topBarBtnText}>{t('cancel')}</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.topBarTitle}>{t('add_exercise')}</Text>
            {selectedExercises.length > 0 && (
              <Text style={styles.topBarSubTitle}>
                {selectedExercises.length} seleccionados
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleConfirmAdd}
            activeOpacity={0.7}
            style={[
              styles.topBarActionBtn,
              selectedExercises.length > 0 && styles.topBarActionBtnActive,
            ]}
          >
            <Text
              style={[
                styles.topBarBtnText,
                selectedExercises.length > 0 && styles.topBarBtnTextActive,
              ]}
            >
              {selectedExercises.length > 0 ? `Listo (${selectedExercises.length})` : t('ready')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Search Input */}
          <View style={styles.searchBox}>
            <Search color="rgba(255,255,255,0.4)" size={18} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('search_exercise_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
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
                <X color="rgba(255,255,255,0.4)" size={18} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills Row */}
          <View style={styles.filterRow}>
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
              <Text style={styles.filterPillText} numberOfLines={1}>
                {selectedEquipment}
              </Text>
              <ChevronDown color="rgba(255,255,255,0.4)" size={14} strokeWidth={2} />
            </TouchableOpacity>

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
              <Text style={styles.filterPillText} numberOfLines={1}>
                {selectedCategory}
              </Text>
              <ChevronDown color="rgba(255,255,255,0.4)" size={14} strokeWidth={2} />
            </TouchableOpacity>
          </View>

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
                      <Check size={16} color="#38BDF8" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
                      <Check size={16} color="#38BDF8" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>
              {searchQuery ? `Resultados (${filteredExercises.length})` : t('recent_exercises')}
            </Text>
            <Text style={styles.sectionHeaderHint}>
              Toca para seleccionar múltiples ejercicios
            </Text>
          </View>

          {/* Exercises List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: selectedExercises.length > 0 ? insets.bottom + 110 : insets.bottom + 40 },
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
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[
                    styles.exerciseRow,
                    isSelected && styles.exerciseRowSelected,
                  ]}
                  onPress={() => toggleExerciseSelection(ex)}
                  activeOpacity={0.7}
                >
                  <ExerciseIllustration
                    exerciseId={ex.id}
                    exerciseName={ex.name}
                    imageUrl={ex.imageUrl}
                    gifUrl={ex.gifUrl}
                    size={48}
                    variant="circle-thumb"
                  />

                  <View style={styles.exerciseInfo}>
                    <Text
                      style={[
                        styles.exerciseName,
                        isSelected && { color: '#38BDF8' },
                      ]}
                      numberOfLines={1}
                    >
                      {ex.name}
                    </Text>
                    <Text style={styles.exerciseMuscle}>
                      {ex.category || ex.muscleGroup} · {ex.equipment}
                    </Text>
                  </View>

                  {/* Multi-select check pill */}
                  <View
                    style={[
                      styles.checkCircle,
                      isSelected && styles.checkCircleSelected,
                    ]}
                  >
                    {isSelected ? (
                      <Check size={16} color="#0F172A" strokeWidth={3} />
                    ) : (
                      <Plus size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                    )}
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
                    <Info color="rgba(255,255,255,0.4)" size={20} strokeWidth={2} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )
            })}

            {filteredExercises.length === 0 && (
              <View style={styles.emptyBox}>
                <Dumbbell color="rgba(255,255,255,0.2)" size={32} strokeWidth={1.5} />
                <Text style={styles.emptyText}>No se encontraron ejercicios</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Floating Bottom Cart Bar */}
        {selectedExercises.length > 0 && (
          <View style={[styles.floatingCartBar, { bottom: Math.max(insets.bottom + 12, 16) }]}>
            <View style={styles.cartInfoBox}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{selectedExercises.length}</Text>
              </View>
              <Text style={styles.cartInfoText}>
                {selectedExercises.length === 1 ? '1 ejercicio listo' : `${selectedExercises.length} ejercicios listos`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cartConfirmBtn}
              onPress={handleConfirmAdd}
              activeOpacity={0.85}
            >
              <Check size={18} color="#0F172A" strokeWidth={2.5} />
              <Text style={styles.cartConfirmBtnText}>
                AÑADIR A LA RUTINA ({selectedExercises.length})
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
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  topBarActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topBarActionBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  topBarBtnText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
  },
  topBarBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  topBarSubTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12141C',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
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
    backgroundColor: '#12141C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  filterPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  filterDropdown: {
    backgroundColor: '#161924',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    maxHeight: 240,
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 25,
    shadowColor: '#000',
    shadowOpacity: 0.75,
    shadowRadius: 16,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterDropdownItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  filterDropdownItemText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '500',
  },
  filterDropdownItemTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  sectionHeaderRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionHeaderHint: {
    color: 'rgba(56, 189, 248, 0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    gap: 8,
    paddingBottom: 40,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1017',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  exerciseRowSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseMuscle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  checkCircleSelected: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
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
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 16,
    right: 16,
    backgroundColor: '#1E2433',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
    gap: 12,
  },
  cartInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBadge: {
    backgroundColor: '#38BDF8',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },
  cartInfoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cartConfirmBtn: {
    flex: 1,
    backgroundColor: '#38BDF8',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cartConfirmBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
})
