import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native'
import { Award, Zap, ChevronRight, Lock, CheckCircle2, X } from 'lucide-react-native'
import { useGamification } from '@/lib/hooks/useGamification'
import { AchievementBadge } from '@/lib/services/gamificationService'

export default function GamificationCard() {
  const {
    level,
    levelTitle,
    currentXp,
    xpToNextLevel,
    levelProgress,
    badges,
    unlockedBadgesCount,
  } = useGamification()

  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null)
  const [showAllBadgesModal, setShowAllBadgesModal] = useState(false)

  return (
    <View style={styles.container}>
      {/* Header con Nivel y XP */}
      <View style={styles.levelHeaderRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>Nivel {level}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.levelTitle}>{levelTitle}</Text>
          <Text style={styles.xpSubtext}>
            {currentXp} XP totales · <Text style={{ color: '#38BDF8' }}>{xpToNextLevel} XP para subir</Text>
          </Text>
        </View>
      </View>

      {/* Barra de Progreso de Nivel */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${Math.round(levelProgress * 100)}%` }]} />
      </View>

      {/* Medallas Destacadas */}
      <View style={styles.badgesSectionHeader}>
        <Text style={styles.badgesSectionTitle}>
          Medallas y Logros ({unlockedBadgesCount}/{badges.length})
        </Text>
        <TouchableOpacity
          onPress={() => setShowAllBadgesModal(true)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={styles.viewAllBadgesText}>Ver todas</Text>
          <ChevronRight size={14} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* Carrusel de Medallas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
        {badges.map((badge) => (
          <TouchableOpacity
            key={badge.id}
            style={[styles.badgeChip, badge.unlocked ? styles.badgeChipUnlocked : styles.badgeChipLocked]}
            onPress={() => setSelectedBadge(badge)}
            activeOpacity={0.75}
          >
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
            <Text style={[styles.badgeName, !badge.unlocked && styles.badgeNameLocked]} numberOfLines={1}>
              {badge.title}
            </Text>
            {badge.unlocked ? (
              <CheckCircle2 size={12} color="#10B981" />
            ) : (
              <Lock size={12} color="#64748B" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal de Detalle de Medalla */}
      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.badgeDetailCard}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setSelectedBadge(null)}
            >
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>

            <Text style={styles.badgeDetailIcon}>{selectedBadge?.icon}</Text>
            <Text style={styles.badgeDetailTitle}>{selectedBadge?.title}</Text>
            <Text style={styles.badgeDetailDesc}>{selectedBadge?.description}</Text>

            <View style={styles.badgeRewardBox}>
              <Zap size={14} color="#F59E0B" />
              <Text style={styles.badgeRewardText}>Recompensa: +{selectedBadge?.xpReward} XP</Text>
            </View>

            <View style={styles.badgeProgressContainer}>
              <View style={styles.badgeProgressRow}>
                <Text style={styles.badgeProgressLabel}>Progreso</Text>
                <Text style={styles.badgeProgressVal}>
                  {selectedBadge?.currentValue} / {selectedBadge?.targetValue}
                </Text>
              </View>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.round((selectedBadge?.progress || 0) * 100)}%`,
                      backgroundColor: selectedBadge?.unlocked ? '#10B981' : '#38BDF8',
                    },
                  ]}
                />
              </View>
            </View>

            {selectedBadge?.unlocked ? (
              <View style={styles.statusUnlockedBox}>
                <CheckCircle2 size={16} color="#10B981" />
                <Text style={styles.statusUnlockedText}>¡Logro Desbloqueado!</Text>
              </View>
            ) : (
              <View style={styles.statusLockedBox}>
                <Lock size={14} color="#64748B" />
                <Text style={styles.statusLockedText}>En progreso</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Todas las Medallas */}
      <Modal
        visible={showAllBadgesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllBadgesModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.allBadgesCard}>
            <View style={styles.allBadgesHeader}>
              <Text style={styles.allBadgesTitle}>Colección de Logros</Text>
              <TouchableOpacity onPress={() => setShowAllBadgesModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                {badges.map((b) => (
                  <View
                    key={b.id}
                    style={[styles.allBadgeRow, b.unlocked ? styles.allBadgeRowUnlocked : styles.allBadgeRowLocked]}
                  >
                    <Text style={{ fontSize: 24 }}>{b.icon}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.allBadgeName}>{b.title}</Text>
                      <Text style={styles.allBadgeDesc}>{b.description}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>+{b.xpReward} XP</Text>
                      {b.unlocked ? (
                        <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800', marginTop: 2 }}>✓ Conseguido</Text>
                      ) : (
                        <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{Math.round(b.progress * 100)}%</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  levelBadgeText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
  },
  levelTitle: {
    color: '#F8FAFC',
    fontSize: 14.5,
    fontWeight: '800',
  },
  xpSubtext: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  badgesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgesSectionTitle: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '700',
  },
  viewAllBadgesText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  badgesScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeChipUnlocked: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeChipLocked: {
    backgroundColor: '#1E293B50',
    borderColor: '#334155',
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeName: {
    color: '#F8FAFC',
    fontSize: 11.5,
    fontWeight: '600',
    maxWidth: 90,
  },
  badgeNameLocked: {
    color: '#94A3B8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  badgeDetailCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
  },
  badgeDetailIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  badgeDetailTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  badgeDetailDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  badgeRewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 14,
  },
  badgeRewardText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeProgressContainer: {
    width: '100%',
    marginTop: 16,
  },
  badgeProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeProgressLabel: {
    color: '#94A3B8',
    fontSize: 11.5,
  },
  badgeProgressVal: {
    color: '#F8FAFC',
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusUnlockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 18,
  },
  statusUnlockedText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  statusLockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 18,
  },
  statusLockedText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  allBadgesCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  allBadgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  allBadgesTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  allBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  allBadgeRowUnlocked: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  allBadgeRowLocked: {
    backgroundColor: '#1E293B40',
    borderColor: '#334155',
  },
  allBadgeName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  allBadgeDesc: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
})
