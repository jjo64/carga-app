import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroTextContainer}>
          <Text style={styles.greeting}>HOY</Text>
          <Text style={styles.heroTitle}>Sobrecarga & Disciplina</Text>
        </View>
        <Ionicons name="flame" size={32} color={theme.colors.primary} />
      </View>

      {/* Resumen Calórico Inicial */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Balance Calórico Diario</Text>
        <View style={styles.calorieRow}>
          <View style={styles.calorieBlock}>
            <Text style={styles.calorieValue}>--</Text>
            <Text style={styles.calorieLabel}>Consumidas</Text>
          </View>
          <Text style={styles.calorieDivider}>/</Text>
          <View style={styles.calorieBlock}>
            <Text style={[styles.calorieValue, { color: theme.colors.primary }]}>--</Text>
            <Text style={styles.calorieLabel}>Objetivo (TDEE)</Text>
          </View>
        </View>
      </View>

      {/* Accesos rápidos */}
      <View style={styles.grid}>
        <View style={styles.miniCard}>
          <Ionicons name="barbell-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.miniCardTitle}>Entrenamiento</Text>
          <Text style={styles.miniCardSubtitle}>Sin sesión activa</Text>
        </View>
        <View style={styles.miniCard}>
          <Ionicons name="nutrition-outline" size={24} color={theme.colors.info} />
          <Text style={styles.miniCardTitle}>Nutrición</Text>
          <Text style={styles.miniCardSubtitle}>0 comidas hoy</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextContainer: {
    gap: theme.spacing.xs,
  },
  greeting: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.sm,
  },
  calorieBlock: {
    alignItems: 'center',
  },
  calorieValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  calorieLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  calorieDivider: {
    color: theme.colors.borderLight,
    fontSize: 28,
    fontWeight: '300',
  },
  grid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  miniCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  miniCardTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  miniCardSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
})
