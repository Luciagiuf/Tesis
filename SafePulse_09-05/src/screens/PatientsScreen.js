import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

export default function PatientsScreen({ navigation }) {
  const { patients, loadPatients, activePatient, setActivePatient } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      if (Platform.OS !== 'web') {
        const { createPatient } = require('../services/firebase');
        await createPatient({ nombre: nombre.trim(), apellido: apellido.trim(), notas: notas.trim() });
        await loadPatients();
      }
      setNombre('');
      setApellido('');
      setNotas('');
      setModalVisible(false);
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear el paciente: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }) => {
    const isActive = activePatient?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => navigation.navigate('PatientDetail', { patient: item })}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.avatar}>
            {item.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardName}>
            {item.nombre}{item.apellido ? ' ' + item.apellido : ''}
          </Text>
          {item.notas ? (
            <Text style={styles.cardNotes} numberOfLines={1}>{item.notas}</Text>
          ) : null}
          <Text style={styles.cardDate}>
            Registrado: {new Date(item.createdAt).toLocaleDateString('es-AR')}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {isActive && <Text style={styles.activeBadge}>ACTIVO</Text>}
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.count}>
          {patients.length} paciente{patients.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={patients}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🧑‍⚕️</Text>
            <Text style={styles.emptyTitle}>Sin pacientes</Text>
            <Text style={styles.emptySub}>
              Tocá "+ Nuevo" para registrar el primer paciente.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Modal alta de paciente */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Nuevo Paciente</Text>

            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: María"
              placeholderTextColor="#475569"
              value={nombre}
              onChangeText={setNombre}
            />

            <Text style={styles.label}>Apellido</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: García"
              placeholderTextColor="#475569"
              value={apellido}
              onChangeText={setApellido}
            />

            <Text style={styles.label}>Notas adicionales</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Ej: diagnóstico, habitación, etc."
              placeholderTextColor="#475569"
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={3}
            />

            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleCreate}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  count: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  addButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardActive: { borderWidth: 1, borderColor: '#3b82f6' },
  cardLeft: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
  },
  cardContent: { flex: 1, paddingVertical: 14 },
  cardName: { color: '#f1f5f9', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
  cardNotes: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  cardDate: { color: '#475569', fontSize: 11 },
  cardRight: { alignItems: 'flex-end', paddingRight: 12, gap: 4 },
  activeBadge: {
    color: '#3b82f6',
    fontSize: 9,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  arrow: { color: '#475569', fontSize: 22 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySub: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
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
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '700' },
});
