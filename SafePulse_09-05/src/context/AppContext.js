import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

// ─── Comportamiento de notificaciones en foreground (de SafePulse_fixed) ──────
// IMPORTANTE: debe estar fuera del componente, a nivel de módulo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};

export const AppProvider = ({ children }) => {
  const [mqttConnected, setMqttConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [events, setEvents] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);

  // ── Pacientes ─────────────────────────────────────────────────────────────
  const [patients, setPatients] = useState([]);
  const [activePatient, setActivePatient] = useState(null);

  // Estado de carga inicial — evita pantalla negra mientras Firestore responde
  const [appReady, setAppReady] = useState(false);

  const soundRef = useRef(null);
  const seenEventIds = useRef(new Set());

  // ─── Permisos de notificaciones al montar (de SafePulse_fixed) ───────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.requestPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        console.warn('SafePulse: permisos de notificación no concedidos');
      }
    }).catch((err) => {
      console.warn('SafePulse: error pidiendo permisos de notificación:', err);
    });
  }, []);

  // ─── Carga inicial desde Firestore ───────────────────────────────────────
  const loadPatients = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const { fetchPatients } = require('../services/firebase');
      const list = await fetchPatients();
      setPatients(list);
    } catch (err) {
      console.warn('[Pacientes] No se pudo cargar la lista:', err);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const { fetchEventsFromFirestore } = require('../services/firebase');
      const list = await fetchEventsFromFirestore(100);
      setEvents(list);
    } catch (err) {
      console.warn('[Eventos] No se pudo cargar historial:', err);
      // No re-lanzar — la app debe seguir funcionando aunque falle Firestore
    }
  }, []);

  // Carga inicial: aunque falle, marcar appReady para que la UI se muestre
  useEffect(() => {
    Promise.allSettled([loadPatients(), loadEvents()]).finally(() => {
      setAppReady(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Notificación local (de SafePulse_fixed, sin cambios) ────────────────
  const fireAlertNotification = useCallback(async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 POSIBLE CONVULSIÓN DETECTADA',
          body: 'Verifique el estado del paciente de inmediato.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
        },
        trigger: null,
      });
    } catch (err) {
      console.warn('SafePulse: error disparando notificación:', err);
    }
  }, []);

  // ─── Sonido de alarma (URL mixkit de SafePulse_fixed) ────────────────────
  const playAlarmSound = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      soundRef.current = sound;
    } catch (err) {
      console.warn('SafePulse: error reproduciendo sonido:', err);
    }
  }, []);

  const stopAlarmSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (_) {}
      soundRef.current = null;
    }
  }, []);

  // ─── Vibración (de SafePulse_fixed, sin cambios) ─────────────────────────
  const triggerVibration = useCallback(async () => {
    try {
      for (let i = 0; i < 5; i++) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (err) {
      console.warn('SafePulse: error vibrando:', err);
    }
  }, []);

  // ─── Manejar mensaje MQTT ─────────────────────────────────────────────────
  const handleMqttMessage = useCallback(
    async (topic, payload) => {
      let data;
      try {
        data = JSON.parse(payload.toString());
      } catch {
        console.warn('SafePulse: payload MQTT no es JSON válido:', payload.toString());
        return;
      }

      setLastMessage({ topic, data, receivedAt: new Date().toISOString() });

      if (topic === 'epilepsia/estado') {
        setDeviceStatus({
          idDispositivo: data.id_dispositivo,
          estadoActual: data.estado_actual,
          timestamp: data.timestamp,
        });
        return;
      }

      if (topic === 'epilepsia/alerta' && data.deteccion === true) {
        setActiveAlert({
          idDispositivo: data.id_dispositivo,
          timestamp: data.timestamp,
          silenced: false,
          attended: false,
        });
        // Secuencia completa de SafePulse_fixed
        await fireAlertNotification();
        playAlarmSound();
        triggerVibration();
        return;
      }

      if (topic === 'epilepsia/evento') {
        const eventKey = `${data.id_dispositivo}_${data.inicio_evento}`;
        if (seenEventIds.current.has(eventKey)) return;
        seenEventIds.current.add(eventKey);

        let mapped = data;
        try {
          const { mapEventToFirestore } = require('../services/eventMapper');
          const currentPatientId = activePatient ? activePatient.id : null;
          mapped = mapEventToFirestore(data, currentPatientId);
        } catch (err) {
          console.warn('SafePulse: no se pudo mapear el evento:', err);
        }

        setEvents((prev) => [mapped, ...prev]);

        if (Platform.OS !== 'web') {
          try {
            const { saveEventToFirestore } = require('../services/firebase');
            await saveEventToFirestore(mapped);
          } catch (err) {
            console.warn('SafePulse: no se pudo guardar en Firestore:', err);
          }
        }
      }
    },
    [playAlarmSound, fireAlertNotification, triggerVibration, activePatient]
  );

  // ─── Silenciar / confirmar alerta (con dismiss de SafePulse_fixed) ────────
  const silenceAlert = useCallback(async () => {
    await stopAlarmSound();
    await Notifications.dismissAllNotificationsAsync().catch(() => {});
    setActiveAlert((prev) => (prev ? { ...prev, silenced: true } : null));
  }, [stopAlarmSound]);

  const confirmAlert = useCallback(async () => {
    await stopAlarmSound();
    await Notifications.dismissAllNotificationsAsync().catch(() => {});
    setActiveAlert(null);
  }, [stopAlarmSound]);

  // ─── MQTT ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let mqttService;
    try {
      ({ mqttService } = require('../services/mqttService'));
    } catch (err) {
      console.warn('SafePulse: no se pudo cargar mqttService:', err);
      return;
    }

    mqttService.connect({
      onConnect: () => setMqttConnected(true),
      onDisconnect: () => setMqttConnected(false),
      onMessage: handleMqttMessage,
    });

    return () => {
      try { mqttService.disconnect(); } catch (_) {}
      stopAlarmSound();
    };
  }, [handleMqttMessage, stopAlarmSound]);

  return (
    <AppContext.Provider
      value={{
        mqttConnected,
        deviceStatus,
        activeAlert,
        events,
        lastMessage,
        silenceAlert,
        confirmAlert,
        patients,
        activePatient,
        setActivePatient,
        loadPatients,
        loadEvents,
        appReady,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
