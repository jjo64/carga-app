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
  Play,
  Clock,
  MoreVertical,
  Edit3,
  Trash2,
  Calendar,
  X,
  AlertTriangle,
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
  const { routines, loading: routinesLoading, deleteRoutine } = useRoutines()

  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [activeMenuRoutine, setActiveMenuRoutine] = useState<any | null>(null)
  const [routineToDelete, setRoutineToDelete] = useState<any | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [detailModalExercise, setDetailModalExercise] = useState<ExerciseDefinition | null>(null)

  const displayRoutines = routines.map((r) => ({
    raw: r,
    id: r.id,
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

  return (
    <View style={styles.container}>
      {/* ── Top Header Section ── */}
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brandName}>⚡ Carga</Text>
            <Text style={styles.screenTitle}>{t('routines_title')}</Text>
          </View>

          <View style={styles.topActionsRow}>
            {/* Search across exercises */}
            <TouchableOpacity
              style={styles.searchIconBtn}
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.8}
            >
              <Search color="rgba(255,255,255,0.7)" size={20} strokeWidth={2} />
            </TouchableOpacity>

            {/* "+" Button to open Create Routine Modal */}
            <TouchableOpacity
              style={styles.addRoutineBtn}
              onPress={() => {
                setEditingRoutine(null)
                setShowCreateRoutineModal(true)
              }}
              activeOpacity={0.8}
            >
              <Plus color="#FFFFFF" size={20} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom AI Routine Banner -> Opens Create Routine Modal */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => {
            setEditingRoutine(null)
            setShowCreateRoutineModal(true)
          }}
          activeOpacity={0.85}
        >
          <Sparkles color="#38BDF8" size={18} strokeWidth={2} />
          <Text style={styles.aiBannerText}>{t('custom_ai_routine')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Routine Cards List ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {routinesLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#38BDF8" size="large" />
          </View>
        ) : displayRoutines.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyIconCircle}>
              <Plus color="#38BDF8" size={32} strokeWidth={2} />
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
              <Plus color="#FFFFFF" size={16} strokeWidth={2.5} />
              <Text style={styles.emptyCreateBtnText}>CREAR PRIMERA RUTINA</Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayRoutines.map((routine) => (
            <View key={routine.id} style={styles.routineCard}>
              {/* Left Content Column */}
              <View style={styles.routineLeftCol}>
                {/* Top Meta Row with Options 3-Dots */}
                <View style={styles.routineMetaHeaderRow}>
                  <Text style={styles.routineMetaText}>
                    {routine.exerciseCount} {t('exercises_count')} | {routine.setCount} {t('sets_count')}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setActiveMenuRoutine(routine)}
                    style={styles.menuOptionsBtn}
                    activeOpacity={0.7}
                  >
                    <MoreVertical color="rgba(255,255,255,0.5)" size={18} />
                  </TouchableOpacity>
                </View>

                {/* Routine Title */}
                <Text style={styles.routineCardTitle}>{routine.title}</Text>

                {/* Assigned Days Badge */}
                {routine.assignedDays && routine.assignedDays.length > 0 && (
                  <View style={styles.assignedDaysBadge}>
                    <Calendar color="#38BDF8" size={12} strokeWidth={2} />
                    <Text style={styles.assignedDaysText} numberOfLines={1}>
                      {routine.assignedDays.join(', ')}
                    </Text>
                  </View>
                )}

                {/* Bullet List of Exercises */}
                <View style={styles.exerciseBulletsList}>
                  {routine.exercises.slice(0, 4).map((ex, idx) => (
                    <Text key={idx} style={styles.exerciseBulletItem} numberOfLines={1}>
                      - {ex}
                    </Text>
                  ))}
                </View>

                {/* Bottom Action Row: Start Button + Duration */}
                <View style={styles.routineBottomActionRow}>
                  <TouchableOpacity
                    style={styles.startBtnPill}
                    onPress={() => handleStartSession(routine.id)}
                    activeOpacity={0.85}
                  >
                    <Play color="#FFFFFF" size={14} fill="#FFFFFF" />
                    <Text style={styles.startBtnPillText}>{t('start_routine')}</Text>
                  </TouchableOpacity>

                  <View style={styles.durationBox}>
                    <Clock color="rgba(255,255,255,0.4)" size={14} strokeWidth={2} />
                    <Text style={styles.durationText}>{routine.duration}</Text>
                  </View>
                </View>
              </View>

              {/* Right Content: Dynamic Anatomical Model with Glow on Active Muscles */}
              <View style={styles.anatomicalCoverWrapper}>
                <RoutineAnatomicalCover
                  exercises={routine.exercises}
                  width={115}
                  height={155}
                  showBadge
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Routine Options Action Modal (Editar / Eliminar) ── */}
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

              <TouchableOpacity
                style={styles.actionOptionBtn}
                onPress={() => handleOpenEdit(activeMenuRoutine)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionOptionIcon, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Edit3 color="#38BDF8" size={18} />
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

      {/* ── Delete Routine Confirmation Dialog (Universal on Web & Native) ── */}
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

      {/* ── Search Exercise Database Modal (Direct from Top Search icon) ── */}
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
    backgroundColor: '#0A0A0A',
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    backgroundColor: '#0E1017',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#181C26',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addRoutineBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  aiBannerText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  routineCard: {
    flexDirection: 'row',
    backgroundColor: '#12141C',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  routineLeftCol: {
    flex: 1,
    gap: 8,
    zIndex: 2,
  },
  routineMetaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineMetaText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  menuOptionsBtn: {
    padding: 4,
    marginRight: -4,
  },
  routineCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  assignedDaysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  assignedDaysText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseBulletsList: {
    gap: 3,
    marginVertical: 4,
  },
  exerciseBulletItem: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  routineBottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  startBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 6,
  },
  startBtnPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  anatomicalCoverWrapper: {
    position: 'absolute',
    right: 4,
    bottom: -6,
    opacity: 0.9,
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
    backgroundColor: '#181C26',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionOptionSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  confirmDialogBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#181C26',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  confirmMessage: {
    color: 'rgba(255,255,255,0.6)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    color: 'rgba(255,255,255,0.8)',
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
    backgroundColor: '#12141C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
})
