import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function WorkoutScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Rutinas</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="#000" />
          <Text style={styles.addButtonText}>Nueva Rutina</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.emptyState}>
        <Ionicons name="barbell-outline" size={48} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>Sin rutinas creadas</Text>
        <Text style={styles.emptySubtitle}>
          Crea tu primera rutina de entrenamiento o genera un plan personalizado con IA.
        </Text>
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
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
})
