import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Share,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Share2, MoreHorizontal, Play, Pause, X, Zap, Trophy, ListChecks } from 'lucide-react-native'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import RoutineAnatomicalCover from '@/components/visuals/RoutineAnatomicalCover'
import { ExerciseDefinition } from '@/constants/exerciseDatabase'
import { getExerciseRecordData } from '@/lib/hooks/useWorkout'

interface Props {
  exercise: ExerciseDefinition | null
  visible: boolean
  onClose: () => void
}

type TabType = 'resumen' | 'historial' | 'indicaciones'

export default function ExerciseDetailModal({ exercise, visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const [activeTab, setActiveTab] = useState<TabType>('resumen')
  const [isPlaying, setIsPlaying] = useState(false)

  if (!exercise) return null

  const recordData = getExerciseRecordData(exercise.name)

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Detalles del ejercicio: ${exercise.name} (${exercise.muscleGroup || exercise.category}) en FitAI.`,
      })
    } catch (e) {
      console.log('Share error:', e)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.topIconBtn} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#FAFAFA" />
          </TouchableOpacity>

          <Text style={styles.topBarTitle} numberOfLines={1}>
            {exercise.name}
          </Text>

          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={handleShare} style={styles.topIconBtn} activeOpacity={0.7}>
              <Share2 size={18} color="#A1A1AA" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.topIconBtn} activeOpacity={0.7}>
              <X size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Capsule Tabs (Resumen, Historial, Indicaciones) */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsCapsule}>
            {[
              { id: 'resumen', label: 'Resumen' },
              { id: 'historial', label: 'Historial' },
              { id: 'indicaciones', label: 'Indicaciones' },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id as TabType)}
                  style={[styles.tabSegment, isActive && styles.tabSegmentActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabSegmentText, isActive && styles.tabSegmentTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Visual Render with Pause/Play Indicator */}
          <View style={styles.mediaCard}>
            <ExerciseIllustration
              exerciseId={exercise.id}
              exerciseName={exercise.name}
              imageUrl={exercise.imageUrl}
              gifUrl={exercise.gifUrl}
              useAnimation={isPlaying}
              size={220}
              variant="large-banner"
            />
            <TouchableOpacity
              style={styles.pausePlayBtn}
              onPress={() => setIsPlaying((p) => !p)}
              activeOpacity={0.85}
            >
              {isPlaying ? (
                <Pause size={14} color="#FAFAFA" />
              ) : (
                <Play size={14} color="#FAFAFA" fill="#FAFAFA" />
              )}
            </TouchableOpacity>
          </View>

          {/* Exercise Title Header */}
          <View style={styles.titleSection}>
            <Text style={styles.exerciseLargeTitle}>{exercise.name}</Text>
            <Text style={styles.exerciseSubtitle}>
              {exercise.category || exercise.muscleGroup} · {exercise.equipment}
            </Text>
          </View>

          {/* TAB 1: RESUMEN */}
          {activeTab === 'resumen' && (
            <View style={styles.tabSection}>
              {/* Muscle Targets Card */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>MÚSCULOS TRABAJADOS</Text>
                <View style={styles.muscleCardContent}>
                  <View style={styles.muscleCardLeft}>
                    <View style={styles.primaryMusclePill}>
                      <Text style={styles.primaryMuscleText}>
                        Principal: {exercise.category || exercise.muscleGroup}
                      </Text>
                    </View>
                    <View style={styles.secondaryMusclesRow}>
                      {exercise.secondaryMuscles.map((sec) => (
                        <View key={sec} style={styles.secondaryMusclePill}>
                          <Text style={styles.secondaryMuscleText}>{sec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.muscleAnatomyThumb}>
                    <RoutineAnatomicalCover
                      exercises={[exercise.name]}
                      width={85}
                      height={115}
                    />
                  </View>
                </View>
              </View>

              {/* Records Quick View */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>RÉCORD ACTUAL & RENDIMIENTO</Text>
                <View style={styles.quickRecordRow}>
                  <Text style={styles.quickRecordVal}>
                    {recordData.maxWeightOverall > 0 ? `${recordData.maxWeightOverall} kg` : 'Sin registros aún'}
                  </Text>
                  {recordData.maxWeightOverall > 0 && (
                    <View style={styles.quickRecordBadge}>
                      <Trophy size={12} color="#FAFAFA" />
                      <Text style={styles.quickRecordBadgeText}>
                        Mejor serie: {recordData.bestSetSummary}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: HISTORIAL */}
          {activeTab === 'historial' && (
            <View style={styles.tabSection}>
              {recordData.lastSessionSets.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>ÚLTIMA SESIÓN REGISTRADA</Text>
                  <View style={styles.setsList}>
                    {recordData.lastSessionSets.map((s) => (
                      <View key={s.setNum} style={styles.setRow}>
                        <Text style={styles.setLabel}>Serie {s.setNum}</Text>
                        <Text style={styles.setVal}>
                          {s.weightKg} kg × {s.reps} reps {s.isWarmup ? '(Calentamiento)' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>SIN HISTORIAL REGISTRADO</Text>
                  <Text style={styles.emptySubText}>
                    Aún no has completado series de este ejercicio en tus entrenamientos.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: INDICACIONES (PASO A PASO EN ESPAÑOL) */}
          {activeTab === 'indicaciones' && (
            <View style={styles.tabSection}>
              {exercise.instructions.allSteps.length > 0 ? (
                exercise.instructions.allSteps.map((step, idx) => (
                  <View key={idx} style={styles.card}>
                    <Text style={styles.cardLabel}>PASO {idx + 1}</Text>
                    <Text style={styles.instructionText}>{step}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>INDICACIONES</Text>
                  <Text style={styles.instructionText}>
                    {exercise.instructions.execution || exercise.instructions.setup || 'Mantén una técnica controlada durante todo el recorrido del movimiento.'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '800',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabsCapsule: {
    flexDirection: 'row',
    backgroundColor: '#121214',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  tabSegment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabSegmentActive: {
    backgroundColor: '#FAFAFA',
  },
  tabSegmentText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '700',
  },
  tabSegmentTextActive: {
    color: '#09090B',
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  mediaCard: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121214',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  pausePlayBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  titleSection: {
    gap: 4,
    paddingHorizontal: 2,
  },
  exerciseLargeTitle: {
    color: '#FAFAFA',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  exerciseSubtitle: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  tabSection: {
    gap: 12,
  },
  card: {
    backgroundColor: '#121214',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 10,
  },
  cardLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  muscleCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleCardLeft: {
    flex: 1,
    gap: 8,
    paddingRight: 12,
  },
  secondaryMusclesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  primaryMusclePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#27272A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  primaryMuscleText: {
    color: '#FAFAFA',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryMusclePill: {
    backgroundColor: '#18181B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  secondaryMuscleText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '600',
  },
  muscleAnatomyThumb: {
    width: 85,
    height: 115,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickRecordVal: {
    color: '#FAFAFA',
    fontSize: 24,
    fontWeight: '900',
  },
  quickRecordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickRecordBadgeText: {
    color: '#FAFAFA',
    fontSize: 11,
    fontWeight: '700',
  },
  setsList: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  setLabel: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600',
  },
  setVal: {
    color: '#FAFAFA',
    fontSize: 13,
    fontWeight: '800',
  },
  emptySubText: {
    color: '#71717A',
    fontSize: 13,
    lineHeight: 18,
  },
  instructionText: {
    color: '#D4D4D8',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
})
