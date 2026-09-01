import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function NutritionScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Resumen de Macros */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Macros del Día</Text>
        <View style={styles.macroRow}>
          <View style={[styles.macroItem, { borderColor: theme.colors.primary + '44' }]}>
            <Text style={[styles.macroVal, { color: theme.colors.primary }]}>0g</Text>
            <Text style={styles.macroLabel}>Proteína</Text>
          </View>
          <View style={[styles.macroItem, { borderColor: theme.colors.info + '44' }]}>
            <Text style={[styles.macroVal, { color: theme.colors.info }]}>0g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={[styles.macroItem, { borderColor: theme.colors.fat + '44' }]}>
            <Text style={[styles.macroVal, { color: theme.colors.fat }]}>0g</Text>
            <Text style={styles.macroLabel}>Grasas</Text>
          </View>
        </View>
      </View>

      {/* Botones de acción rápida */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.primaryAction}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#000" />
          <Text style={styles.primaryActionText}>Registrar con Texto / IA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction}>
          <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.secondaryActionText}>Escanear Etiqueta</Text>
        </TouchableOpacity>
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
  macroRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  macroVal: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  macroLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    gap: theme.spacing.sm,
  },
  primaryAction: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  primaryActionText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryAction: {
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  secondaryActionText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
})
