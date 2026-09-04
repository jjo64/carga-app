import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Activity, RefreshCw, CheckCircle2, ShieldCheck, Footprints, Moon, Flame } from 'lucide-react-native'
import { healthSyncService, HealthSyncStatus } from '@/lib/services/healthSyncService'

export default function HealthSyncCard() {
  const [syncStatus, setSyncStatus] = useState<HealthSyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)

  const loadStatus = async () => {
    const saved = await healthSyncService.getSavedSyncStatus()
    if (saved) {
      setSyncStatus(saved)
    } else {
      const live = await healthSyncService.syncAllHealthData()
      setSyncStatus(live)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const updated = await healthSyncService.syncAllHealthData()
      setSyncStatus(updated)
    } finally {
      setSyncing(false)
    }
  }

  const handleRequestAccess = async () => {
    const granted = await healthSyncService.requestPermissions()
    if (granted) {
      await handleSyncNow()
    }
  }

  const providerName = syncStatus?.providerName || (Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect')

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Activity size={16} color="#38BDF8" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Sincronización de Salud</Text>
            <Text style={styles.cardSub}>
              Conectado a <Text style={{ color: '#38BDF8', fontWeight: '700' }}>{providerName}</Text>
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSyncNow}
          disabled={syncing}
          activeOpacity={0.7}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <RefreshCw size={15} color="#38BDF8" />
          )}
          <Text style={styles.syncBtnText}>{syncing ? 'Sincronizando' : 'Actualizar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de Métricas Sincronizadas */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Footprints size={14} color="#38BDF8" />
          <Text style={styles.metricValue}>
            {syncStatus?.syncedMetrics?.stepsToday?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.metricLabel}>Pasos hoy</Text>
        </View>

        <View style={styles.metricItem}>
          <Flame size={14} color="#F97316" />
          <Text style={styles.metricValue}>
            {syncStatus?.syncedMetrics?.activeCaloriesBurned || '0'} kcal
          </Text>
          <Text style={styles.metricLabel}>Quemadas</Text>
        </View>

        <View style={styles.metricItem}>
          <Moon size={14} color="#A78BFA" />
          <Text style={styles.metricValue}>
            {syncStatus?.syncedMetrics?.sleepHoursToday || '0'}h
          </Text>
          <Text style={styles.metricLabel}>Sueño</Text>
        </View>
      </View>

      {/* Footer de Estado */}
      <View style={styles.footerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={12} color="#10B981" />
          <Text style={styles.footerStatusText}>
            Sensores nativos activos y calibrados
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  syncBtnText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#1E293B50',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  footerRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerStatusText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10.5,
  },
})
