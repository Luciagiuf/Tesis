import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { formatDatetime } from '../utils/dateHelpers';

export default function AlertScreen({ navigation }) {
  const { activeAlert, silenceAlert, confirmAlert } = useApp();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animación de pulso
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Si se confirma la alerta, volver al dashboard
  useEffect(() => {
    if (!activeAlert) {
      navigation.navigate('Dashboard');
    }
  }, [activeAlert]);

  if (!activeAlert) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Ícono pulsante */}
        <Animated.Text
          style={[styles.icon, { transform: [{ scale: pulseAnim }] }]}
        >
          🚨
        </Animated.Text>

        {/* Título */}
        <Text style={styles.title}>POSIBLE CONVULSIÓN{'\n'}DETECTADA</Text>

        {/* Info del dispositivo */}
        <View style={styles.infoBox}>
          <InfoRow label="Dispositivo" value={activeAlert.idDispositivo} />
          <InfoRow label="Hora" value={formatDatetime(activeAlert.timestamp)} />
          <InfoRow
            label="Sonido"
            value={activeAlert.silenced ? '🔇 Silenciado' : '🔊 Activo'}
          />
        </View>

        {/* Instrucción */}
        <Text style={styles.instruction}>
          Verifique el estado del paciente de inmediato.{'\n'}
          Si la convulsión persiste más de 5 minutos, llame al servicio de emergencias.
        </Text>

        {/* Botones */}
        <View style={styles.buttonRow}>
          {!activeAlert.silenced && (
            <TouchableOpacity
              style={[styles.button, styles.silenceButton]}
              onPress={silenceAlert}
            >
              <Text style={styles.buttonIcon}>🔇</Text>
              <Text style={styles.buttonText}>Silenciar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={confirmAlert}
          >
            <Text style={styles.buttonIcon}>✅</Text>
            <Text style={styles.buttonText}>Atendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#7f1d1d' },
  container: {
    flex: 1,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 32,
    lineHeight: 40,
  },
  infoBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  instruction: {
    color: '#fecaca',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silenceButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  confirmButton: {
    backgroundColor: '#166534',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
