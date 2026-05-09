import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import StatusCard from '../components/StatusCard';
import AlertBanner from '../components/AlertBanner';
import EventCard from '../components/EventCard';
import PatientSelector from '../components/PatientSelector';
import { formatDatetime } from '../utils/dateHelpers';

export default function DashboardScreen({ navigation }) {
  const { mqttConnected, deviceStatus, activeAlert, events, lastMessage, activePatient } = useApp();

  const recentEvents = events.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={false} tintColor="#3b82f6" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.logo}>💓 SafePulse</Text>
              <Text style={styles.subtitle}>Sistema de monitoreo nocturno</Text>
            </View>
            {/* NUEVO: selector de paciente activo */}
            <PatientSelector />
          </View>
        </View>

        {/* NUEVO: acceso rápido a pacientes */}
        <TouchableOpacity
          style={styles.patientsButton}
          onPress={() => navigation.navigate('Patients')}
        >
          <Text style={styles.patientsButtonText}>🧑‍⚕️ Gestionar Pacientes</Text>
          {activePatient && (
            <Text style={styles.patientsButtonSub}>
              Activo: {activePatient.nombre}{activePatient.apellido ? ' ' + activePatient.apellido : ''}
            </Text>
          )}
        </TouchableOpacity>

        {/* Alerta activa — SIN CAMBIOS */}
        {activeAlert && (
          <AlertBanner
            alert={activeAlert}
            onPress={() => navigation.navigate('Alert')}
          />
        )}

        {/* Estado del dispositivo — SIN CAMBIOS */}
        <StatusCard deviceStatus={deviceStatus} mqttConnected={mqttConnected} />

        {/* Último mensaje — SIN CAMBIOS */}
        {lastMessage && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ÚLTIMO MENSAJE</Text>
            <Text style={styles.cardDetail}>Topic: {lastMessage.topic}</Text>
            <Text style={styles.cardDetail}>
              Recibido: {formatDatetime(lastMessage.receivedAt)}
            </Text>
          </View>
        )}

        {/* Episodios recientes — SIN CAMBIOS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Episodios Recientes</Text>
          {events.length > 3 && (
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>Ver todos ({events.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentEvents.length > 0 ? (
          recentEvents.map((event, idx) => (
            <EventCard
              key={event.deviceId + event.startTime + idx}
              event={event}
              onPress={() => navigation.navigate('EventDetail', { event })}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Sin episodios detectados</Text>
          </View>
        )}

        {/* Botón historial completo — SIN CAMBIOS */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.historyButtonText}>📋 Ver Historial Completo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: { color: '#f8fafc', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  patientsButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  patientsButtonText: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  patientsButtonSub: { color: '#3b82f6', fontSize: 12, marginTop: 4 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardDetail: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  seeAll: {
    color: '#3b82f6',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#64748b', fontSize: 14 },
  historyButton: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
});
