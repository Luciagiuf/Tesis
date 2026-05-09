import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import EventCard from '../components/EventCard';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'assigned', label: 'Asignados' },
  { key: 'unassigned', label: 'Sin paciente' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
];

function isWithinDays(isoString, days) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return (now - d) / (1000 * 60 * 60 * 24) <= days;
}

export default function HistoryScreen({ navigation }) {
  const { events, patients, loadEvents } = useApp();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Construir mapa id → nombre completo
  const patientMap = {};
  patients.forEach((p) => {
    patientMap[p.id] = `${p.nombre}${p.apellido ? ' ' + p.apellido : ''}`;
  });

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadEvents();
    } finally {
      setLoading(false);
    }
  }, [loadEvents]);

  // Recargar desde Firestore cuando se entra a la pantalla
  useEffect(() => {
    handleRefresh();
  }, []);

  // Aplicar filtro activo
  const filtered = events.filter((e) => {
    if (filter === 'assigned') return !!e.patientId;
    if (filter === 'unassigned') return !e.patientId;
    if (filter === 'week') return isWithinDays(e.createdAt || e.startTime, 7);
    if (filter === 'month') return isWithinDays(e.createdAt || e.startTime, 30);
    return true;
  });

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>Sin episodios registrados</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'all'
          ? 'Los episodios detectados aparecerán aquí automáticamente.'
          : 'No hay episodios para el filtro seleccionado.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.count}>
          {filtered.length} de {events.length} episodio{events.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity onPress={handleRefresh} disabled={loading}>
          <Text style={styles.refreshBtn}>{loading ? '…' : '↻ Actualizar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filtersRow}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => item.id || `${item.deviceId}_${item.startTime}_${idx}`}
          renderItem={({ item }) => (
            <View>
              {/* Badge de paciente */}
              {item.patientId && patientMap[item.patientId] ? (
                <Text style={styles.patientTag}>👤 {patientMap[item.patientId]}</Text>
              ) : (
                <Text style={styles.unassignedTag}>⚠️ Sin paciente asignado</Text>
              )}
              <EventCard
                event={item}
                onPress={() => navigation.navigate('EventDetail', { event: item })}
              />
            </View>
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  count: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  refreshBtn: { color: '#3b82f6', fontSize: 13 },
  filtersRow: { marginBottom: 4 },
  filtersList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
  },
  filterChipActive: { borderColor: '#3b82f6', backgroundColor: '#1d4ed820' },
  filterText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#3b82f6' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  patientTag: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    marginTop: 6,
  },
  unassignedTag: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
