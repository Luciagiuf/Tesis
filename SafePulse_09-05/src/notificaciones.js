/**
 * SafePulse — Módulo de notificaciones push
 * Archivo destino: src/notificaciones.js
 *
 * QUÉ HACE:
 * 1. Pide permisos al usuario
 * 2. Obtiene el token FCM nativo
 * 3. Lo guarda en Firestore bajo el documento del paciente
 * 4. Configura canal de sonido en Android
 * 5. Expone listeners para cuando llega una notificación
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./services/firebase";

// Cómo se muestran las notificaciones con la app ABIERTA
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Inicializa notificaciones para un paciente.
 * Llamá esta función al iniciar la app o al seleccionar paciente.
 * @param {string} pacienteId - ID del documento en Firestore
 * @returns {string|null} token FCM o null si falló
 */
export async function inicializarNotificaciones(pacienteId) {
  if (!Device.isDevice) {
    console.warn("[SafePulse] Se necesita dispositivo físico para push.");
    return null;
  }

  // Pedir permisos
  const { status: actual } = await Notifications.getPermissionsAsync();
  let final = actual;

  if (actual !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }

  if (final !== "granted") {
    console.warn("[SafePulse] Permisos denegados.");
    return null;
  }

  // Canal Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("safepulse_alertas", {
      name: "Alertas de Crisis SafePulse",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: null,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  // Obtener token FCM
  let token;

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    token = tokenData.data;

    console.log(
      "[SafePulse] Token FCM:",
      token.slice(0, 20) + "..."
    );
  } catch (err) {
    console.error("[SafePulse] Error obteniendo token:", err);
    return null;
  }

  // Guardar en Firestore
  if (pacienteId && token) {
    try {
      await updateDoc(doc(db, "patients", pacienteId), {
        fcmTokens: arrayUnion(token),
      });

      console.log(
        "[SafePulse] Token guardado para paciente:",
        pacienteId
      );
    } catch (err) {
      console.error("[SafePulse] Error guardando token:", err);
    }
  }

  return token;
}

/**
 * Registra listeners de notificaciones.
 * Retorna una función de cleanup para useEffect.
 */
export function configurarListeners(onRecibida, onPresionada) {
  const s1 = Notifications.addNotificationReceivedListener((n) => {
    if (onRecibida) onRecibida(n);
  });

  const s2 =
    Notifications.addNotificationResponseReceivedListener((r) => {
      if (onPresionada) {
        onPresionada(r.notification.request.content.data);
      }
    });

  return () => {
    s1.remove();
    s2.remove();
  };
}

/**
 * Verifica si la app fue abierta desde una notificación.
 */
export async function verificarAperturaDesdeNotificacion() {
  const resp =
    await Notifications.getLastNotificationResponseAsync();

  return resp
    ? resp.notification.request.content.data
    : null;
}