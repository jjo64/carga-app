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
import { ArrowLeft, Share2, MoreHorizontal, Play, Pause } from 'lucide-react-native'
import ExerciseIllustration from '@/components/visuals/ExerciseIllustration'
import RoutineAnatomicalCover from '@/components/visuals/RoutineAnatomicalCover'
import { ExerciseDefinition } from '@/constants/exerciseDatabase'

interface Props {
  exercise: ExerciseDefinition | null
  visible: boolean
  onClose: () => void
}

type TabType = 'resumen' | 'historial' | 'indicaciones'

export default function ExerciseDetailModal({ exercise, visible, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('resumen')
  const [isPlaying, setIsPlaying] = useState(false)

  if (!exercise) return null

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Detalles del ejercicio: ${exercise.name} (${exercise.muscleGroup}) en FitAI.`,
      })
    } catch (e) {
      console.log('Share error:', e)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topBarTitle} numberOfLines={1}>
            {exercise.name}
          </Text>

          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
              <Share2 size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <MoreHorizontal size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3 Tabs (Resumen, Historial, Indicaciones) */}
        <View style={styles.tabsRow}>
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
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.tabActiveIndicator} />}
              </TouchableOpacity>
            )
          })}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Visual Render with Pause/Play Indicator */}
          <View style={styles.illustrationWrapper}>
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
                <Pause size={14} color="#FFFFFF" />
              ) : (
                <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
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
              {/* Muscle Targets Card with Native Anatomical Vector Highlight */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>MÚSCULOS TRABAJADOS</Text>
                <View style={styles.muscleCardContent}>
                  <View style={styles.muscleCardLeft}>
                    <View style={styles.primaryMusclePill}>
                      <Text style={styles.primaryMuscleText}>
                        Principal: {exercise.category || exercise.muscleGroup}
                      </Text>
                    </View>
                    {exercise.secondaryMuscles.map((sec) => (
                      <View key={sec} style={styles.secondaryMusclePill}>
                        <Text style={styles.secondaryMuscleText}>{sec}</Text>
                      </View>
                    ))}
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
                <Text style={styles.cardLabel}>RÉCORD ACTUAL</Text>
                <View style={styles.quickRecordRow}>
                  <Text style={styles.quickRecordVal}>{exercise.records.maxWeight} kg</Text>
                  <View style={styles.quickRecordBadge}>
                    <Text style={styles.quickRecordBadgeText}>
                      +{exercise.records.changePct}% este mes
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: HISTORIAL */}
          {activeTab === 'historial' && (
            <View style={styles.tabSection}>
              {(exercise.history || []).map((sess, idx) => (
                <View key={idx} style={styles.card}>
                  <Text style={styles.cardDate}>{sess.date}</Text>
                  <View style={styles.setsList}>
                    {sess.sets.map((s) => (
                      <View key={s.setNum} style={styles.setRow}>
                        <Text style={styles.setLabel}>Serie {s.setNum}</Text>
                        <Text style={styles.setVal}>
                          {s.weightKg} kg × {s.reps} reps
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB 3: INDICACIONES (PASO A PASO EN ESPAÑOL) */}
          {activeTab === 'indicaciones' && (
            <View style={styles.tabSection}>
              {exercise.instructions.allSteps.map((step, idx) => (
                <View key={idx} style={styles.card}>
                  <Text style={styles.cardLabel}>PASO {idx + 1}</Text>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              ))}
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
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 8,
  },
  iconBtn: {
    padding: 6,
  },
  topBarTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0A0A0A',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabBtnActive: {},
  tabBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  tabActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 50,
  },
  illustrationWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  pausePlayBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  titleSection: {
    gap: 4,
  },
  exerciseLargeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  exerciseSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '600',
  },
  tabSection: {
    gap: 14,
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  muscleCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleCardLeft: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },
  muscleAnatomyThumb: {
    width: 85,
    height: 115,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryMusclePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56,189,248,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  primaryMuscleText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryMusclePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryMuscleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  quickRecordRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  quickRecordVal: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  quickRecordBadge: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickRecordBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  setsList: {
    gap: 6,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  setLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  setVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  instructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 20,
  },
})
