import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.userName}>Mi Perfil</Text>
        <Text style={styles.userEmail}>Configura tus datos para el cálculo de BMR/TDEE</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parámetros Físicos</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Altura</Text>
          <Text style={styles.infoValue}>-- cm</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Objetivo</Text>
          <Text style={styles.infoValue}>--</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nivel de Actividad</Text>
          <Text style={styles.infoValue}>--</Text>
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
    gap: theme.spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  userName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
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
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSubtle,
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
})
