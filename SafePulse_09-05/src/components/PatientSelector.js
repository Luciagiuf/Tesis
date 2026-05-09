import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useApp } from '../context/AppContext';

/**
 * Muestra el paciente activo y permite seleccionar otro desde una lista.
 * No rompe ningún flujo existente: si no hay paciente seleccionado, los
 * eventos se guardan sin asociación (comportamiento original).
 */
export default function PatientSelector() {
  const { patients, activePatient, setActivePatient } = useApp();
  const [visible, setVisible] = useState(false);

  const label = activePatient
    ? `${activePatient.nombre}${activePatient.apellido ? ' ' + activePatient.apellido : ''}`
    : 'Sin paciente';

  return (
    <>
      <TouchableOpacity style={styles.pill} onPress={() => setVisible(true)}>
        <Text style={styles.pillIcon}>👤</Text>
        <Text style={styles.pillLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.pillChevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Seleccionar paciente</Text>

            <TouchableOpacity
              style={[styles.item, !activePatient && styles.itemActive]}
              onPress={() => { setActivePatient(null); setVisible(false); }}
            >
              <Text style={styles.itemText}>— Sin paciente —</Text>
            </TouchableOpacity>

            <FlatList
              data={patients}
              keyExtractor={p => p.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, activePatient?.id === item.id && styles.itemActive]}
                  onPress={() => { setActivePatient(item); setVisible(false); }}
                >
                  <View>
                    <Text style={styles.itemText}>
                      {item.nombre}{item.apellido ? ' ' + item.apellido : ''}
                    </Text>
                    {item.notas ? (
                      <Text style={styles.itemSub}>{item.notas}</Text>
                    ) : null}
                  </View>
                  {activePatient?.id === item.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>No hay pacientes registrados aún.</Text>
              }
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
    maxWidth: 220,
  },
  pillIcon: { fontSize: 14 },
  pillLabel: { color: '#f1f5f9', fontSize: 13, fontWeight: '600', flex: 1 },
  pillChevron: { color: '#64748b', fontSize: 12 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  sheetTitle: {
    color: '#f1f5f9',
    fontWeight: 'bold',
    fontSize: 17,
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  itemActive: { backgroundColor: '#0f172a' },
  itemText: { color: '#f1f5f9', fontSize: 15 },
  itemSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  checkmark: { color: '#38bdf8', fontWeight: 'bold', fontSize: 16 },
  empty: { color: '#64748b', textAlign: 'center', paddingVertical: 20 },
});
