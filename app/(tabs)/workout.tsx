import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import {
  Plus,
  Search,
  Sparkles,
  MoreHorizontal,
  Edit3,
  Trash2,
  Calendar,
  X,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Check,
} from 'lucide-react-native'
import RoutineAnatomicalCover from '@/components/visuals/RoutineAnatomicalCover'
import AddExerciseModal from '@/components/workout/AddExerciseModal'
import ExerciseDetailModal from '@/components/workout/ExerciseDetailModal'
import CreateRoutineModal from '@/components/workout/CreateRoutineModal'
import { ExerciseDefinition } from '@/constants/exerciseDatabase'
import { useLanguage } from '@/lib/i18n'
import {
  useRoutines,
  parseRoutineDays,
  cleanRoutineDescription,
} from '@/lib/hooks/useWorkout'
import { Routine } from '@/types'

export default function WorkoutScreen() {
  const router = useRouter()
  const { t } = useLanguage()
  const { routines, loading: routinesLoading, deleteRoutine, reorderRoutines } = useRoutines()

  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [activeMenuRoutine, setActiveMenuRoutine] = useState<any | null>(null)
  const [routineToDelete, setRoutineToDelete] = useState<any | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [detailModalExercise, setDetailModalExercise] = useState<ExerciseDefinition | null>(null)
  const [isReordering, setIsReordering] = useState(false)

  const displayRoutines = routines.map((r, idx) => ({
    raw: r,
    id: r.id,
    index: idx,
    title: r.name,
    description: cleanRoutineDescription(r.description),
    assignedDays: parseRoutineDays(r),
    exerciseCount: r.exercises?.length || 0,
    setCount: r.exercises?.reduce((sum, e) => sum + (e.target_sets || 3), 0) || 0,
    duration: `${Math.max(20, Math.round((r.exercises?.length || 3) * 12))} min`,
    exercises: r.exercises?.map((e) => e.name) || [],
  }))

  const handleStartSession = (routineId: string) => {
    router.push(`/workout/session/${routineId}`)
  }

  const handleOpenEdit = (routineItem: any) => {
    setActiveMenuRoutine(null)
    setEditingRoutine(routineItem.raw)
    setShowCreateRoutineModal(true)
  }

  const handlePromptDelete = (routineItem: any) => {
    setActiveMenuRoutine(null)
    setRoutineToDelete(routineItem)
  }

  const handleConfirmDelete = async () => {
    if (!routineToDelete) return
    const id = routineToDelete.id
    setRoutineToDelete(null)
    await deleteRoutine(id)
  }

  const handleMoveRoutine = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= routines.length) return
    const updated = [...routines]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    await reorderRoutines(updated)
  }

  return (
    <View style={styles.container}>
      {/* ── Top Header Section ── */}
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Rutinas</Text>

          <View style={styles.topActionsRow}>
            {/* Reorder Button */}
            {routines.length > 1 && (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setIsReordering((prev) => !prev)}
                activeOpacity={0.7}
              >
                {isReordering ? (
                  <Check color="#38BDF8" size={22} strokeWidth={2.5} />
                ) : (
                  <ArrowUpDown color="#FAFAFA" size={22} strokeWidth={1.75} />
                )}
              </TouchableOpacity>
            )}

            {/* Search across exercises */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.7}
            >
              <Search color="#FAFAFA" size={22} strokeWidth={1.75} />
            </TouchableOpacity>

            {/* "+" Button to open Create Routine Modal */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                setEditingRoutine(null)
                setShowCreateRoutineModal(true)
              }}
              activeOpacity={0.7}
            >
              <Plus color="#FAFAFA" size={26} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom AI Routine Pill Button */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => {
            setEditingRoutine(null)
            setShowCreateRoutineModal(true)
          }}
          activeOpacity={0.85}
        >
          <Sparkles color="#C4B5FD" size={17} strokeWidth={1.75} />
          <Text style={styles.aiBannerText}>Rutina personalizada con IA</Text>
        </TouchableOpacity>
      </View>

      {/* ── Routine Cards List ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {routinesLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#FAFAFA" size="large" />
          </View>
        ) : displayRoutines.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyIconCircle}>
              <Plus color="#FAFAFA" size={32} strokeWidth={1.75} />
            </View>
            <Text style={styles.emptyStateTitle}>No tienes rutinas creadas</Text>
            <Text style={styles.emptyStateSubtitle}>
              Crea tu propia rutina personalizada con tus ejercicios favoritos o genera una con IA para empezar.
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => {
                setEditingRoutine(null)
                setShowCreateRoutineModal(true)
              }}
              activeOpacity={0.85}
            >
              <Plus color="#000000" size={16} strokeWidth={2.5} />
              <Text style={styles.emptyCreateBtnText}>CREAR PRIMERA RUTINA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayRoutines.map((routine, idx) => (
            <View key={routine.id} style={[styles.routineCard, isReordering && styles.routineCardReordering]}>
              {/* Reordering Controls if active */}
              {isReordering && (
                <View style={styles.reorderPillCol}>
                  <TouchableOpacity
                    onPress={() => handleMoveRoutine(idx, 'up')}
                    disabled={idx === 0}
                    style={[styles.reorderPillBtn, idx === 0 && { opacity: 0.25 }]}
                  >
                    <ChevronUp color="#FAFAFA" size={18} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={styles.reorderIdxBadge}>{idx + 1}</Text>
                  <TouchableOpacity
                    onPress={() => handleMoveRoutine(idx, 'down')}
                    disabled={idx === displayRoutines.length - 1}
                    style={[styles.reorderPillBtn, idx === displayRoutines.length - 1 && { opacity: 0.25 }]}
                  >
                    <ChevronDown color="#FAFAFA" size={18} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Card Body */}
              <View style={styles.routineBodyWrapper}>
                {/* Top Meta Row */}
                <View style={styles.routineMetaHeaderRow}>
                  <Text style={styles.routineMetaText}>
                    {routine.exerciseCount} EJERCICIOS · {routine.setCount} SERIES
                  </Text>
                  <TouchableOpacity
                    onPress={() => setActiveMenuRoutine(routine)}
                    style={styles.menuOptionsBtn}
                    activeOpacity={0.7}
                  >
                    <MoreHorizontal color="#71717A" size={20} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                {/* Routine Title & Day Badge */}
                <View style={styles.titleAndDayRow}>
                  <Text style={styles.routineCardTitle} numberOfLines={1}>
                    {routine.title}
                  </Text>
                  {routine.assignedDays && routine.assignedDays.length > 0 && (
                    <View style={styles.assignedDaysBadge}>
                      <Text style={styles.assignedDaysText} numberOfLines={1}>
                        {routine.assignedDays[0]}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Split Row: Exercise List (Left) + Anatomical Model (Right) */}
                <View style={styles.splitContentRow}>
                  {/* Left Column: Clean bullet list */}
                  <View style={styles.exerciseBulletsList}>
                    {routine.exercises.slice(0, 3).map((ex, exIdx) => (
                      <View key={exIdx} style={styles.exerciseBulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.exerciseBulletText} numberOfLines={2}>
                          {ex}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Right Column: Anatomical Cover */}
                  <View style={styles.anatomicalCoverWrapper}>
                    <RoutineAnatomicalCover
                      exercises={routine.exercises}
                      width={110}
                      height={150}
                      showBadge
                    />
                  </View>
                </View>

                {/* Bottom Full CTA Bar: INICIAR + Duration */}
                <TouchableOpacity
                  style={styles.startCtaBar}
                  onPress={() => handleStartSession(routine.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.startCtaTextContainer}>
                    <Text style={styles.startCtaText}>INICIAR</Text>
                  </View>
                  <Text style={styles.durationText}>{routine.duration}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Routine Options Action Modal (Editar / Reordenar / Eliminar) ── */}
      {activeMenuRoutine && (
        <Modal
          visible={!!activeMenuRoutine}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveMenuRoutine(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setActiveMenuRoutine(null)}
          >
            <View style={styles.actionSheetBox}>
              <View style={styles.actionSheetHeader}>
                <Text style={styles.actionSheetTitle} numberOfLines={1}>
                  {activeMenuRoutine.title}
                </Text>
                <TouchableOpacity onPress={() => setActiveMenuRoutine(null)}>
                  <X color="rgba(255,255,255,0.4)" size={20} />
                </TouchableOpacity>
              </View>

              {/* Move Up */}
              {activeMenuRoutine.index > 0 && (
                <TouchableOpacity
                  style={styles.actionOptionBtn}
                  onPress={() => {
                    handleMoveRoutine(activeMenuRoutine.index, 'up')
                    setActiveMenuRoutine(null)
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionOptionIcon, { backgroundColor: '#27272A' }]}>
                    <ChevronUp color="#FAFAFA" size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>Mover hacia arriba</Text>
                    <Text style={styles.actionOptionSub}>Subir posición en la lista</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Move Down */}
              {activeMenuRoutine.index < displayRoutines.length - 1 && (
                <TouchableOpacity
                  style={styles.actionOptionBtn}
                  onPress={() => {
                    handleMoveRoutine(activeMenuRoutine.index, 'down')
                    setActiveMenuRoutine(null)
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.actionOptionIcon, { backgroundColor: '#27272A' }]}>
                    <ChevronDown color="#FAFAFA" size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionOptionTitle}>Mover hacia abajo</Text>
                    <Text style={styles.actionOptionSub}>Bajar posición en la lista</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionOptionBtn}
                onPress={() => handleOpenEdit(activeMenuRoutine)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionOptionIcon, { backgroundColor: '#27272A' }]}>
                  <Edit3 color="#FAFAFA" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionOptionTitle}>Editar rutina</Text>
                  <Text style={styles.actionOptionSub}>Cambiar nombre, días y ejercicios</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionOptionBtn}
                onPress={() => handlePromptDelete(activeMenuRoutine)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionOptionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Trash2 color="#EF4444" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionOptionTitle, { color: '#EF4444' }]}>Eliminar rutina</Text>
                  <Text style={styles.actionOptionSub}>Quitar de tu lista de entrenamientos</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── Delete Routine Confirmation Dialog ── */}
      {routineToDelete && (
        <Modal
          visible={!!routineToDelete}
          transparent
          animationType="fade"
          onRequestClose={() => setRoutineToDelete(null)}
        >
          <View style={styles.modalOverlayCenter}>
            <View style={styles.confirmDialogBox}>
              <View style={styles.confirmIconCircle}>
                <AlertTriangle color="#EF4444" size={28} />
              </View>
              <Text style={styles.confirmTitle}>¿Eliminar rutina?</Text>
              <Text style={styles.confirmMessage}>
                ¿Estás seguro de que deseas eliminar la rutina "{routineToDelete.title}"? Esta acción no se puede deshacer.
              </Text>
              <View style={styles.confirmActionsRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setRoutineToDelete(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmDeleteBtn}
                  onPress={handleConfirmDelete}
                  activeOpacity={0.8}
                >
                  <Trash2 color="#FFFFFF" size={16} />
                  <Text style={styles.confirmDeleteText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Create / Edit Routine Modal ── */}
      <CreateRoutineModal
        visible={showCreateRoutineModal}
        routineToEdit={editingRoutine}
        onClose={() => {
          setShowCreateRoutineModal(false)
          setEditingRoutine(null)
        }}
      />

      {/* ── Search Exercise Database Modal ── */}
      <AddExerciseModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectExercise={(ex) => {
          setShowSearchModal(false)
          setDetailModalExercise(ex)
        }}
        onOpenInfo={(ex) => {
          setDetailModalExercise(ex)
        }}
      />

      {/* Exercise Detail / Technique Modal */}
      {detailModalExercise && (
        <ExerciseDetailModal
          visible={!!detailModalExercise}
          exercise={detailModalExercise}
          onClose={() => setDetailModalExercise(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    color: '#FAFAFA',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 10,
  },
  aiBannerText: {
    color: '#D4D4D8',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  routineCard: {
    backgroundColor: '#18181B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
    overflow: 'hidden',
  },
  routineBodyWrapper: {
    gap: 14,
  },
  routineMetaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineMetaText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  menuOptionsBtn: {
    padding: 4,
    marginRight: -4,
  },
  titleAndDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  routineCardTitle: {
    color: '#FAFAFA',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  assignedDaysBadge: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  assignedDaysText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
  },
  splitContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  exerciseBulletsList: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  exerciseBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  bulletDot: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginRight: 6,
    lineHeight: 18,
  },
  exerciseBulletText: {
    color: '#D4D4D8',
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },
  anatomicalCoverWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCtaBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  startCtaTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingLeft: 40,
  },
  startCtaText: {
    color: '#09090B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  durationText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionSheetBox: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
    borderTopWidth: 1,
    borderColor: '#27272A',
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  actionSheetTitle: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  actionOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOptionTitle: {
    color: '#FAFAFA',
    fontSize: 15,
    fontWeight: '700',
  },
  actionOptionSub: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 2,
  },
  confirmDialogBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#18181B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 14,
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    color: '#FAFAFA',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  confirmMessage: {
    color: '#A1A1AA',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 6,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#18181B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 12,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyStateTitle: {
    color: '#FAFAFA',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    color: '#71717A',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyCreateBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  routineCardReordering: {
    borderColor: '#38BDF8',
    paddingLeft: 12,
  },
  reorderPillCol: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 10,
    gap: 4,
  },
  reorderPillBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderIdxBadge: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '900',
  },
})
