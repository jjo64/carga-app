import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useRoutines } from '@/lib/hooks/useWorkout'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function WorkoutScreen() {
  const router = useRouter()
  const { routines, loading, createRoutine, deleteRoutine, refetch } = useRoutines()

  const [modalVisible, setModalVisible] = useState(false)
  const [newRoutineName, setNewRoutineName] = useState('')
  const [newRoutineDesc, setNewRoutineDesc] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreateRoutine() {
    if (!newRoutineName.trim()) return

    setCreating(true)
    const { data, error } = await createRoutine(
      newRoutineName.trim(),
      newRoutineDesc.trim() || undefined
    )
    setCreating(false)

    if (!error && data) {
      setNewRoutineName('')
      setNewRoutineDesc('')
      setModalVisible(false)
      // Redirigir a la pantalla de la rutina para agregar ejercicios
      router.push(`/workout/${data.id}`)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header con botón para crear rutina */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mis Rutinas</Text>
            <Text style={styles.subtitle}>
              {routines.length} {routines.length === 1 ? 'rutina' : 'rutinas'} guardadas
            </Text>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#000" />
            <Text style={styles.createButtonText}>Nueva</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Rutinas */}
        {loading && routines.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : routines.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="barbell-outline" size={36} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sin rutinas activas</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primer split (ej: "Push - Pecho/Tríceps", "Tirón", "Pierna") para comenzar a trackear tus entrenos.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#000" />
              <Text style={styles.emptyButtonText}>Crear mi primera rutina</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.routineList}>
            {routines.map((routine) => {
              const exerciseCount = routine.exercises?.length || 0

              return (
                <View key={routine.id} style={styles.routineCard}>
                  <TouchableOpacity
                    style={styles.routineCardMain}
                    onPress={() => router.push(`/workout/${routine.id}`)}
                  >
                    <View style={styles.routineCardHeader}>
                      <Text style={styles.routineName}>{routine.name}</Text>
                      <TouchableOpacity
                        onPress={() => deleteRoutine(routine.id)}
                        style={styles.deleteRoutineBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={theme.colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>

                    {routine.description && (
                      <Text style={styles.routineDesc}>{routine.description}</Text>
                    )}

                    <View style={styles.routineMeta}>
                      <Ionicons
                        name="list-outline"
                        size={16}
                        color={theme.colors.textMuted}
                      />
                      <Text style={styles.metaText}>
                        {exerciseCount}{' '}
                        {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Botón rápido para iniciar entrenamiento */}
                  <TouchableOpacity
                    style={styles.startSessionButton}
                    onPress={() => router.push(`/workout/${routine.id}`)}
                  >
                    <Ionicons name="play" size={16} color="#000" />
                    <Text style={styles.startSessionText}>Entrenar</Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal para Crear Rutina */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Rutina</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre de la Rutina *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Empuje A (Pecho, Hombro, Tríceps)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newRoutineName}
                  onChangeText={setNewRoutineName}
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descripción o Notas (Opcional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Ej: Enfoque en press inclinado y aperturas"
                  placeholderTextColor={theme.colors.textMuted}
                  value={newRoutineDesc}
                  onChangeText={setNewRoutineDesc}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  (!newRoutineName.trim() || creating) && styles.modalSubmitBtnDisabled,
                ]}
                onPress={handleCreateRoutine}
                disabled={!newRoutineName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Crear y Añadir Ejercicios</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  createButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingBox: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  emptyButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  routineList: {
    gap: theme.spacing.md,
  },
  routineCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  routineCardMain: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  routineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routineName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  deleteRoutineBtn: {
    padding: 4,
  },
  routineDesc: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
  },
  routineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  startSessionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  startSessionText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    gap: theme.spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
})
