import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import EventCard from '../components/EventCard';
import { formatDuration, formatDatetime } from '../utils/dateHelpers';

export default function PatientDetailScreen({ route, navigation }) {
  const { patient } = route.params;
  const { setActivePatient, activePatient, loadPatients } = useApp();
  const [patientEvents, setPatientEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edición
  const [editVisible, setEditVisible] = useState(false);
  const [editNombre, setEditNombre] = useState(patient.nombre);
  const [editApellido, setEditApellido] = useState(patient.apellido || '');
  const [editNotas, setEditNotas] = useState(patient.notas || '');
  const [saving, setSaving] = useState(false);

  const isActive = activePatient?.id === patient.id;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS !== 'web') {
        const { fetchEventsFromFirestore } = require('../services/firebase');
        const list = await fetchEventsFromFirestore(100, patient.id);
        setPatientEvents(list);
      }
    } catch (err) {
      console.warn('[PatientDetail] Error cargando eventos:', err);
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  useEffect(() => {
    loadEvents();
    navigation.setOptions({
      title: `${patient.nombre}${patient.apellido ? ' ' + patient.apellido : ''}`,
    });
  }, [loadEvents]);

  // Estadísticas
  const totalEvents = patientEvents.length;
  const totalDuration = patientEvents.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
  const avgDuration = totalEvents > 0 ? Math.round(totalDuration / totalEvents) : 0;
  const maxIntensity = patientEvents.length > 0
    ? Math.max(...patientEvents.map((e) => e.intensity || 0))
    : 0;
  const lastEvent = patientEvents[0] || null;

  const handleSetActive = () => {
    if (isActive) {
      setActivePatient(null);
      Alert.alert('Paciente desvinculado', 'Los próximos eventos no se asociarán a ningún paciente.');
    } else {
      setActivePatient(patient);
      Alert.alert(
        'Paciente activo',
        `Los próximos eventos se asociarán a ${patient.nombre}.`
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!editNombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      if (Platform.OS !== 'web') {
        const { updatePatient } = require('../services/firebase');
        await updatePatient(patient.id, {
          nombre: editNombre.trim(),
          apellido: editApellido.trim(),
          notas: editNotas.trim(),
        });
        await loadPatients();
      }
      // Actualizar título
      navigation.setOptions({
        title: `${editNombre.trim()}${editApellido.trim() ? ' ' + editApellido.trim() : ''}`,
      });
      setEditVisible(false);
      Alert.alert('Guardado', 'Los datos del paciente fueron actualizados.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Encabezado del paciente */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {(editNombre || patient.nombre).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.patientName}>
              {editNombre || patient.nombre}
              {(editApellido || patient.apellido) ? ' ' + (editApellido || patient.apellido) : ''}
            </Text>
            {(editNotas || patient.notas) ? (
              <Text style={styles.patientNotes}>{editNotas || patient.notas}</Text>
            ) : null}
            {lastEvent && (
              <Text style={styles.lastEventLabel}>
                Último evento: {formatDatetime(lastEvent.startTime || lastEvent.createdAt)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.activeBtn, isActive && styles.activeBtnOn]}
            onPress={handleSetActive}
          >
            <Text style={[styles.activeBtnText, isActive && styles.activeBtnTextOn]}>
              {isActive ? '✓ Activo para nuevos eventos' : 'Activar para próximos eventos'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditVisible(true)}
          >
            <Text style={styles.editBtnText}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsRow}>
        <StatBox label="Episodios" value={totalEvents} />
        <StatBox label="Duración total" value={formatDuration(totalDuration)} />
        <StatBox label="Duración media" value={formatDuration(avgDuration)} />
        <StatBox label="Max RMS" value={maxIntensity.toFixed(2)} />
      </View>

      {/* Lista de eventos */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>HISTORIAL DE EPISODIOS</Text>
        <TouchableOpacity onPress={loadEvents}>
          <Text style={styles.refresh}>↻ Actualizar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={patientEvents}
          keyExtractor={(item, idx) => item.id || `${item.startTime}_${idx}`}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => navigation.navigate('EventDetail', { event: item })}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Sin episodios registrados</Text>
              <Text style={styles.emptySub}>
                Activá este paciente antes de que ocurra un evento para asociarlo.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de edición */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setEditVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Editar Paciente</Text>

            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#475569"
              value={editNombre}
              onChangeText={setEditNombre}
            />

            <Text style={styles.label}>Apellido</Text>
            <TextInput
              style={styles.input}
              placeholder="Apellido"
              placeholderTextColor="#475569"
              value={editApellido}
              onChangeText={setEditApellido}
            />

            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Notas adicionales"
              placeholderTextColor="#475569"
              value={editNotas}
              onChangeText={setEditNotas}
              multiline
              numberOfLines={3}
            />

            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    backgroundColor: '#1e293b',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 14 },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#f1f5f9', fontSize: 22, fontWeight: 'bold' },
  headerInfo: { flex: 1 },
  patientName: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold' },
  patientNotes: { color: '#64748b', fontSize: 13, marginTop: 2 },
  lastEventLabel: { color: '#38bdf8', fontSize: 11, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  activeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeBtnOn: { borderColor: '#3b82f6', backgroundColor: '#1d4ed820' },
  activeBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  activeBtnTextOn: { color: '#3b82f6' },
  editBtn: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { fontSize: 18 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: '#38bdf8', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  statLabel: { color: '#64748b', fontSize: 9, fontWeight: '600', textAlign: 'center' },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  refresh: { color: '#3b82f6', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sheetTitle: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 18, marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: '#334155', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '700' },
});
