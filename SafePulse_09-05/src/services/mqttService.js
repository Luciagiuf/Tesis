import mqtt from '@taoqf/react-native-mqtt';

// ── Configuración del broker ───────────────────────────────────────────────
// HiveMQ público soporta WebSockets en puerto 8884 (WSS) o 8083 (WS)
// React Native requiere WebSocket; NO soporta TCP puro en Expo
const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';

const TOPICS = [
  'epilepsia/estado',
  'epilepsia/alerta',
  'epilepsia/evento',
];

const CLIENT_ID = `safepulse_${Math.random().toString(16).slice(2, 8)}`;

class MqttService {
  constructor() {
    this.client = null;
    this.callbacks = {};
  }

  connect({ onConnect, onDisconnect, onMessage }) {
    this.callbacks = { onConnect, onDisconnect, onMessage };

    if (this.client) {
      this.client.end(true);
    }

    this.client = mqtt.connect(BROKER_URL, {
      clientId: CLIENT_ID,
      clean: true,
      reconnectPeriod: 5000,   // Reconexión automática cada 5 s
      connectTimeout: 10000,
    });

    this.client.on('connect', () => {
      console.log('[MQTT] Conectado a', BROKER_URL);
      this.client.subscribe(TOPICS, { qos: 1 }, (err) => {
        if (err) console.warn('[MQTT] Error al suscribirse:', err);
        else console.log('[MQTT] Suscrito a topics:', TOPICS);
      });
      onConnect();
    });

    this.client.on('reconnect', () => {
      console.log('[MQTT] Reconectando...');
    });

    this.client.on('disconnect', () => {
      console.log('[MQTT] Desconectado');
      onDisconnect();
    });

    this.client.on('offline', () => {
      console.log('[MQTT] Offline');
      onDisconnect();
    });

    this.client.on('error', (err) => {
      console.warn('[MQTT] Error:', err.message);
    });

    this.client.on('message', (topic, payload) => {
      onMessage(topic, payload);
    });
  }

  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
  }

  isConnected() {
    return this.client?.connected ?? false;
  }
}

// Singleton
export const mqttService = new MqttService();