import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatDatetime,
  formatDuration,
  intensityLabel,
  intensityColor,
} from '../utils/dateHelpers';

export default function EventDetailScreen({ route }) {
  const { event } = route.params;
  const color = intensityColor(event.intensity);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Encabezado de intensidad */}
        <View style={[styles.intensityHeader, { borderColor: color }]}>
          <Text style={[styles.intensityValue, { color }]}>
            {intensityLabel(event.intensity)}
          </Text>
          <Text style={styles.intensityRms}>
            RMS: {event.intensity?.toFixed(3)}
          </Text>
        </View>

        {/* Sección: Tiempo */}
        <Section title="⏱ Tiempo del Episodio">
          <DetailRow label="Inicio" value={formatDatetime(event.startTime)} />
          <DetailRow label="Fin" value={formatDatetime(event.endTime)} />
          <DetailRow label="Duración" value={formatDuration(event.durationSeconds)} highlight />
        </Section>

        {/* Sección: Señal */}
        <Section title="📊 Datos de la Señal">
          <DetailRow label="RMS (Intensidad)" value={event.intensity?.toFixed(4)} />
          <DetailRow label="Cantidad de Picos" value={String(event.peakCount)} highlight />
          <DetailRow label="Clasificación" value={intensityLabel(event.intensity)} />
        </Section>

        {/* Sección: Dispositivo */}
        <Section title="📡 Dispositivo">
          <DetailRow label="ID" value={event.deviceId} />
          {event.createdAt && (
            <DetailRow label="Registrado" value={formatDatetime(event.createdAt)} />
          )}
        </Section>

        {/* Barra visual de intensidad */}
        <Section title="Nivel de Intensidad">
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min((event.intensity ?? 0) * 100, 100)}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
          <View style={styles.barLabels}>
            <Text style={styles.barLabel}>0</Text>
            <Text style={styles.barLabel}>0.5</Text>
            <Text style={styles.barLabel}>1.0</Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight && styles.highlight]}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 20, paddingBottom: 40 },
  intensityHeader: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#1e293b',
  },
  intensityValue: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 4,
  },
  intensityRms: {
    color: '#64748b',
    fontSize: 14,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  highlight: {
    color: '#38bdf8',
    fontSize: 16,
  },
  barContainer: {
    height: 16,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLabel: {
    color: '#475569',
    fontSize: 11,
  },
});