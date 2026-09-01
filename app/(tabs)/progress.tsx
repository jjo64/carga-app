import { useState, useEffect, useCallback } from 'react'
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
  Alert,
  Platform,
} from 'react-native'
import { useAuth } from '@/lib/hooks/useAuth'
import { theme } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'
import {
  logBodyWeight,
  getWeightHistory,
  logBodyMeasurements,
  getMeasurementsHistory,
  BodyMeasurement,
} from '@/lib/api/progress'
import { BodyWeight } from '@/types'

export default function ProgressScreen() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const [weightHistory, setWeightHistory] = useState<BodyWeight[]>([])
  const [measurementsHistory, setMeasurementsHistory] = useState<BodyMeasurement[]>([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [weightModalVisible, setWeightModalVisible] = useState(false)
  const [measurementsModalVisible, setMeasurementsModalVisible] = useState(false)

  // Inputs
  const [inputWeight, setInputWeight] = useState('')
  const [inputWaist, setInputWaist] = useState('')
  const [inputChest, setInputChest] = useState('')
  const [inputArm, setInputArm] = useState('')
  const [inputThigh, setInputThigh] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [weights, measurements] = await Promise.all([
      getWeightHistory(user.id, 30),
      getMeasurementsHistory(user.id, 10),
    ])
    setWeightHistory(weights)
    setMeasurementsHistory(measurements)
    if (weights.length > 0) {
      setInputWeight(weights[0].weight_kg.toString())
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const latestWeight = weightHistory.length > 0 ? weightHistory[0] : null
  const latestMeasurement = measurementsHistory.length > 0 ? measurementsHistory[0] : null

  async function handleLogWeight() {
    const val = parseFloat(inputWeight)
    if (isNaN(val) || val <= 0 || !user) return

    setSubmitting(true)
    const { error } = await logBodyWeight(user.id, val, today)
    setSubmitting(false)

    if (!error) {
      setWeightModalVisible(false)
      await fetchData()
    } else {
      Alert.alert('Error', 'No se pudo registrar el peso.')
    }
  }

  async function handleLogMeasurements() {
    if (!user) return

    setSubmitting(true)
    const { error } = await logBodyMeasurements({
      userId: user.id,
      date: today,
      waistCm: parseFloat(inputWaist) || undefined,
      chestCm: parseFloat(inputChest) || undefined,
      armCm: parseFloat(inputArm) || undefined,
      thighCm: parseFloat(inputThigh) || undefined,
    })
    setSubmitting(false)

    if (!error) {
      setMeasurementsModalVisible(false)
      await fetchData()
    } else {
      Alert.alert('Error', 'No se pudieron registrar las medidas.')
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchData}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Tarjeta de Peso Actual */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSectionTitle}>Peso Corporal</Text>
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => setWeightModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text style={styles.logBtnText}>Registrar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weightDisplay}>
          <Text style={styles.weightNumber}>
            {latestWeight ? latestWeight.weight_kg : '--'}
          </Text>
          <Text style={styles.weightUnit}>kg</Text>
        </View>

        <Text style={styles.weightDateText}>
          {latestWeight
            ? `Último registro: ${latestWeight.date}`
            : 'Sin registros de peso aún'}
        </Text>
      </View>

      {/* Tarjeta de Medidas Corporales */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSectionTitle}>Medidas Antropométricas</Text>
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => setMeasurementsModalVisible(true)}
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text style={styles.logBtnText}>Medir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.measureGrid}>
          <View style={styles.measureItem}>
            <Text style={styles.measureVal}>
              {latestMeasurement?.waist_cm ? `${latestMeasurement.waist_cm} cm` : '--'}
            </Text>
            <Text style={styles.measureLabel}>Cintura</Text>
          </View>

          <View style={styles.measureItem}>
            <Text style={styles.measureVal}>
              {latestMeasurement?.chest_cm ? `${latestMeasurement.chest_cm} cm` : '--'}
            </Text>
            <Text style={styles.measureLabel}>Pecho</Text>
          </View>

          <View style={styles.measureItem}>
            <Text style={styles.measureVal}>
              {latestMeasurement?.arm_cm ? `${latestMeasurement.arm_cm} cm` : '--'}
            </Text>
            <Text style={styles.measureLabel}>Brazo</Text>
          </View>

          <View style={styles.measureItem}>
            <Text style={styles.measureVal}>
              {latestMeasurement?.thigh_cm ? `${latestMeasurement.thigh_cm} cm` : '--'}
            </Text>
            <Text style={styles.measureLabel}>Muslo</Text>
          </View>
        </View>
      </View>

      {/* Historial de Pesaje */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Historial de Peso</Text>

        {weightHistory.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="scale-outline" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>Registra tu peso para ver tu evolución.</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {weightHistory.map((item, index) => {
              const previous = weightHistory[index + 1]
              const delta = previous
                ? (item.weight_kg - previous.weight_kg).toFixed(1)
                : null

              return (
                <View key={item.id} style={styles.historyRow}>
                  <View>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>

                  <View style={styles.historyRight}>
                    <Text style={styles.historyWeight}>{item.weight_kg} kg</Text>
                    {delta !== null && (
                      <Text
                        style={[
                          styles.deltaText,
                          parseFloat(delta) > 0
                            ? styles.deltaPositive
                            : parseFloat(delta) < 0
                            ? styles.deltaNegative
                            : styles.deltaNeutral,
                        ]}
                      >
                        {parseFloat(delta) > 0 ? `+${delta}` : delta} kg
                      </Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* Modal Registrar Peso */}
      <Modal
        visible={weightModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Peso de Hoy</Text>
              <TouchableOpacity
                onPress={() => setWeightModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.weightInputRow}>
              <TextInput
                style={styles.weightBigInput}
                placeholder="75.0"
                placeholderTextColor={theme.colors.textMuted}
                value={inputWeight}
                onChangeText={setInputWeight}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.weightInputUnit}>kg</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                (!inputWeight.trim() || submitting) && styles.modalSubmitBtnDisabled,
              ]}
              onPress={handleLogWeight}
              disabled={!inputWeight.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Guardar Peso</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Registrar Medidas */}
      <Modal
        visible={measurementsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMeasurementsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Medidas (cm)</Text>
              <TouchableOpacity
                onPress={() => setMeasurementsModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.measureForm}>
              <View style={styles.measureInputGroup}>
                <Text style={styles.inputLabel}>Cintura (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: 82.5"
                  placeholderTextColor={theme.colors.textMuted}
                  value={inputWaist}
                  onChangeText={setInputWaist}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.measureInputGroup}>
                <Text style={styles.inputLabel}>Pecho (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: 104.0"
                  placeholderTextColor={theme.colors.textMuted}
                  value={inputChest}
                  onChangeText={setInputChest}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.measureInputGroup}>
                <Text style={styles.inputLabel}>Brazo (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: 38.0"
                  placeholderTextColor={theme.colors.textMuted}
                  value={inputArm}
                  onChangeText={setInputArm}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.measureInputGroup}>
                <Text style={styles.inputLabel}>Muslo (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: 58.5"
                  placeholderTextColor={theme.colors.textMuted}
                  value={inputThigh}
                  onChangeText={setInputThigh}
                  keyboardType="decimal-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submitting && styles.modalSubmitBtnDisabled]}
                onPress={handleLogMeasurements}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Guardar Medidas</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: theme.spacing.xl * 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  logBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  logBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.xs,
  },
  weightNumber: {
    color: theme.colors.text,
    fontSize: 48,
    fontWeight: '900',
  },
  weightUnit: {
    color: theme.colors.textMuted,
    fontSize: 20,
    fontWeight: 'bold',
  },
  weightDateText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  measureGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  measureItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  measureVal: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  measureLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: 6,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  historyList: {
    gap: theme.spacing.xs,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSubtle,
  },
  historyDate: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyWeight: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  deltaText: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 60,
    textAlign: 'right',
  },
  deltaPositive: {
    color: theme.colors.warning,
  },
  deltaNegative: {
    color: theme.colors.primary,
  },
  deltaNeutral: {
    color: theme.colors.textMuted,
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
    maxWidth: 450,
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
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing.md,
  },
  weightBigInput: {
    color: theme.colors.text,
    fontSize: 40,
    fontWeight: '900',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    textAlign: 'center',
    width: 140,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  weightInputUnit: {
    color: theme.colors.textMuted,
    fontSize: 24,
    fontWeight: 'bold',
  },
  measureForm: {
    gap: theme.spacing.sm,
  },
  measureInputGroup: {
    gap: 4,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 14,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  modalSubmitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  modalSubmitBtnDisabled: {
    opacity: 0.6,
  },
  modalSubmitBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
})
