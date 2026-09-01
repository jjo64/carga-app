import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function ProgressScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Peso Corporal</Text>
        <View style={styles.weightRow}>
          <Text style={styles.weightValue}>--</Text>
          <Text style={styles.weightUnit}>kg</Text>
        </View>
        <Text style={styles.weightSub}>Último registro</Text>
      </View>

      <TouchableOpacity style={styles.logButton}>
        <Ionicons name="add-circle-outline" size={20} color="#000" />
        <Text style={styles.logButtonText}>Registrar Peso de Hoy</Text>
      </TouchableOpacity>
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
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cardTitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  weightValue: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: 'bold',
  },
  weightUnit: {
    color: theme.colors.textMuted,
    fontSize: 20,
    fontWeight: '600',
  },
  weightSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  logButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  logButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
})
