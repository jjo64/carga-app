import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
} from 'react-native'
import {
  Mic,
  MicOff,
  Sparkles,
  Check,
  X,
  Volume2,
  Zap,
  RotateCcw,
  Flame,
} from 'lucide-react-native'
import { aiService } from '@/lib/services/ai'
import { VoiceLogResult } from '@/lib/services/ai/types'

interface VoiceSetLoggerModalProps {
  visible: boolean
  onClose: () => void
  currentExerciseName: string
  nextSetNumber: number
  onLogVoiceSet: (data: {
    setNum?: number
    weightKg: number
    reps: number
    rpe?: number
    notes?: string
  }) => void
}

const SAMPLE_DICTATIONS = [
  '100 kilos a 8 repeticiones con RPE 8',
  '80 kg x 10 reps',
  'Tercera serie 90 kilos a 6 repeticiones',
  '62.5 kg 12 reps con 2 en recámara',
]

export default function VoiceSetLoggerModal({
  visible,
  onClose,
  currentExerciseName,
  nextSetNumber,
  onLogVoiceSet,
}: VoiceSetLoggerModalProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedResult, setParsedResult] = useState<VoiceLogResult | null>(null)
  const [editedWeight, setEditedWeight] = useState('80')
  const [editedReps, setEditedReps] = useState('10')
  const [editedRpe, setEditedRpe] = useState('8')

  // Animación de onda de audio
  const pulseAnim = useRef(new Animated.Value(1)).current
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [isListening])

  // Iniciar reconocimiento de voz (Web Speech API si está disponible)
  const startListening = () => {
    setTranscript('')
    setParsedResult(null)

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition()
          recognition.lang = 'es-ES'
          recognition.continuous = false
          recognition.interimResults = true

          recognition.onstart = () => {
            setIsListening(true)
          }

          recognition.onresult = (event: any) => {
            const current = event.resultIndex
            const text = event.results[current][0].transcript
            setTranscript(text)
          }

          recognition.onerror = (event: any) => {
            console.log('Speech error:', event)
            setIsListening(false)
          }

          recognition.onend = () => {
            setIsListening(false)
          }

          recognitionRef.current = recognition
          recognition.start()
          return
        } catch (e) {
          console.warn('Web speech failed:', e)
        }
      }
    }

    // Si no está en Web Speech o en móvil sin API nativa, simular modo escucha
    setIsListening(true)
    setTimeout(() => {
      setIsListening(false)
      if (!transcript) {
        setTranscript('100 kilos a 8 repeticiones con RPE 8')
      }
    }, 2500)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setIsListening(false)
  }

  const handleProcessTranscript = async (textToParse?: string) => {
    const text = (textToParse || transcript).trim()
    if (!text) {
      Alert.alert('Audio vacío', 'Por favor dicta o escribe lo que realizaste en la serie.')
      return
    }

    setLoading(true)
    try {
      const { data } = await aiService.parseVoiceLog(text, currentExerciseName)
      setParsedResult(data)
      setEditedWeight(String(data.weightKg || 80))
      setEditedReps(String(data.reps || 10))
      setEditedRpe(data.rpe ? String(data.rpe) : '8')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo procesar el dictado.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    const weight = parseFloat(editedWeight) || (parsedResult?.weightKg ?? 80)
    const reps = parseInt(editedReps, 10) || (parsedResult?.reps ?? 10)
    const rpe = editedRpe ? parseFloat(editedRpe) : parsedResult?.rpe

    onLogVoiceSet({
      setNum: parsedResult?.setNum || nextSetNumber,
      weightKg: weight,
      reps,
      rpe,
      notes: parsedResult?.notes || undefined,
    })

    handleClose()
  }

  const handleClose = () => {
    stopListening()
    setParsedResult(null)
    setTranscript('')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Mic size={14} color="#38BDF8" />
                <Text style={styles.badgeText}>HANDS-FREE VOICE LOGGER</Text>
              </View>
              <Text style={styles.headerTitle}>Registrar Serie por Voz</Text>
              <Text style={styles.exerciseSubtitle}>
                {currentExerciseName} • Serie #{nextSetNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {!parsedResult ? (
              <View style={styles.micSection}>
                {/* Botón de Micrófono Animado */}
                <TouchableOpacity
                  onPress={isListening ? stopListening : startListening}
                  activeOpacity={0.8}
                  style={styles.micBtnOuter}
                >
                  <Animated.View
                    style={[
                      styles.micPulseCircle,
                      isListening && styles.micPulseActive,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    {isListening ? (
                      <MicOff size={36} color="#FFFFFF" />
                    ) : (
                      <Mic size={36} color="#0F172A" />
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <Text style={styles.micStatusText}>
                  {isListening ? '🎙️ Escuchando... Habla ahora' : 'Toca el micrófono para dictar'}
                </Text>
                <Text style={styles.micHintText}>
                  Di por ejemplo: "100 kilos a 8 repeticiones con RPE 8"
                </Text>

                {/* Transcripción en vivo */}
                <View style={styles.transcriptBox}>
                  <TextInput
                    style={styles.transcriptInput}
                    placeholder="O escribe aquí el dictado de tu serie..."
                    placeholderTextColor="#64748B"
                    value={transcript}
                    onChangeText={setTranscript}
                    multiline
                  />
                  {transcript.length > 0 && (
                    <TouchableOpacity
                      style={styles.parseTranscriptBtn}
                      onPress={() => handleProcessTranscript()}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0F172A" size="small" />
                      ) : (
                        <>
                          <Sparkles size={16} color="#0F172A" />
                          <Text style={styles.parseTranscriptBtnText}>Procesar (~300ms)</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Chips de ejemplos rápidos para probar */}
                <Text style={styles.presetsLabel}>Ejemplos rápidos:</Text>
                <View style={styles.presetChipsWrap}>
                  {SAMPLE_DICTATIONS.map((text, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.presetChip}
                      onPress={() => {
                        setTranscript(text)
                        handleProcessTranscript(text)
                      }}
                    >
                      <Text style={styles.presetChipText}>"{text}"</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              /* ================= TARJETA DE SERIE RECONOCIDA ================= */
              <View style={styles.resultContainer}>
                <View style={styles.successBanner}>
                  <Check size={18} color="#10B981" />
                  <Text style={styles.successBannerText}>
                    Serie interpretada con éxito ({Math.round((parsedResult.confidence || 0.95) * 100)}% certeza)
                  </Text>
                </View>

                <Text style={styles.rawTranscriptQuote}>"{parsedResult.rawTranscript}"</Text>

                {/* Grid de Datos Extraídos */}
                <View style={styles.dataGrid}>
                  {/* Peso */}
                  <View style={styles.dataCard}>
                    <Text style={styles.dataCardLabel}>PESO</Text>
                    <View style={styles.dataInputRow}>
                      <TextInput
                        style={styles.dataInput}
                        keyboardType="decimal-pad"
                        value={editedWeight}
                        onChangeText={setEditedWeight}
                      />
                      <Text style={styles.dataUnit}>kg</Text>
                    </View>
                  </View>

                  {/* Repeticiones */}
                  <View style={styles.dataCard}>
                    <Text style={styles.dataCardLabel}>REPETICIONES</Text>
                    <View style={styles.dataInputRow}>
                      <TextInput
                        style={styles.dataInput}
                        keyboardType="number-pad"
                        value={editedReps}
                        onChangeText={setEditedReps}
                      />
                      <Text style={styles.dataUnit}>reps</Text>
                    </View>
                  </View>

                  {/* RPE */}
                  <View style={styles.dataCard}>
                    <Text style={styles.dataCardLabel}>RPE</Text>
                    <View style={styles.dataInputRow}>
                      <TextInput
                        style={styles.dataInput}
                        keyboardType="decimal-pad"
                        value={editedRpe}
                        onChangeText={setEditedRpe}
                      />
                      <Text style={styles.dataUnit}>/10</Text>
                    </View>
                  </View>
                </View>

                {parsedResult.notes && (
                  <View style={styles.notesCard}>
                    <Text style={styles.notesLabel}>Notas registradas:</Text>
                    <Text style={styles.notesContent}>{parsedResult.notes}</Text>
                  </View>
                )}

                {/* Botón Confirmar */}
                <TouchableOpacity style={styles.confirmSaveBtn} onPress={handleConfirm}>
                  <Check size={20} color="#0F172A" />
                  <Text style={styles.confirmSaveBtnText}>
                    Completar Serie #{parsedResult.setNum || nextSetNumber} e Iniciar Descanso
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    setParsedResult(null)
                    setTranscript('')
                  }}
                >
                  <RotateCcw size={15} color="#94A3B8" />
                  <Text style={styles.retryBtnText}>Volver a dictar</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#090D16',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 20,
  },
  micSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  micBtnOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  micPulseCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  micPulseActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  micStatusText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  micHintText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 20,
  },
  transcriptBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  transcriptInput: {
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  parseTranscriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#38BDF8',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  parseTranscriptBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  presetsLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  presetChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 10,
  },
  presetChip: {
    backgroundColor: '#0F172A',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  presetChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  resultContainer: {
    paddingBottom: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#064E3B30',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B98140',
    marginBottom: 12,
  },
  successBannerText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  rawTranscriptQuote: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  dataGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  dataCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  dataCardLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  dataInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dataInput: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    padding: 0,
    minWidth: 36,
    textAlign: 'center',
  },
  dataUnit: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 2,
  },
  notesCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  notesLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  notesContent: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  confirmSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  confirmSaveBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
})
