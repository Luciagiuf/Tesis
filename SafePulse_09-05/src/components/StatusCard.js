import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const STATUS_CONFIG = {
  iniciando: { color: '#6b7280', label: 'Iniciando', icon: '⏳' },
  normal:    { color: '#22c55e', label: 'Normal',    icon: '✅' },
  monitoreo: { color: '#3b82f6', label: 'Monitoreo', icon: '👁️' },
  crisis:    { color: '#ef4444', label: 'Crisis',    icon: '🚨' },
};

export default function StatusCard({ deviceStatus, mqttConnected }) {
  const config = deviceStatus
    ? STATUS_CONFIG[deviceStatus.estadoActual] ?? STATUS_CONFIG.normal
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.sectionTitle}>Estado del Dispositivo</Text>
        <View style={[styles.dot, { backgroundColor: mqttConnected ? '#22c55e' : '#6b7280' }]} />
        <Text style={styles.connLabel}>{mqttConnected ? 'Conectado' : 'Desconectado'}</Text>
      </View>

      {deviceStatus ? (
        <>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '22', borderColor: config.color }]}>
            <Text style={styles.statusIcon}>{config.icon}</Text>
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.meta}>Dispositivo: {deviceStatus.idDispositivo}</Text>
          <Text style={styles.meta}>Última actualización: {deviceStatus.timestamp}</Text>
        </>
      ) : (
        <Text style={styles.noData}>
          {mqttConnected ? 'Esperando datos del dispositivo...' : 'Sin conexión MQTT'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    flex: 1,
    textTransform: 'uppercase',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  connLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statusText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  noData: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
  },
});