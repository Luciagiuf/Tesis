#include <Wire.h>
#include <MPU6050.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

MPU6050 mpu;

// ===== IDENTIFICADOR DE DISPOSITIVO =====
const char* DEVICE_ID = "esp32_01";

// ===== WiFi / MQTT =====
const char* ssid     = "FernetBranca";
const char* password = "Gintonic4";
const char* broker   = "broker.hivemq.com";
const int   port     = 1883;

// ===== TOPICS MQTT =====
const char* topicEstado = "epilepsia/estado";
const char* topicAlerta = "epilepsia/alerta";
const char* topicEvento = "epilepsia/evento";

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// ===== NTP =====
const char* ntpServer        = "pool.ntp.org";
const long  gmtOffset_sec    = -10800; // UTC-3 Argentina
const int   daylightOffset_sec = 0;

// ===== PINES =====
const int buzzerPin = 4;
const int SDA_PIN   = 5;
const int SCL_PIN   = 6;

// ===== VENTANA DE ANÁLISIS =====
const int N = 30;
float ventanaMagnitud[N];
int   indice       = 0;
bool  ventanaLlena = false;

// ===== UMBRALES =====
const float umbralPico       = 0.05;
const int   cantidadPicosMin = 2;
const float umbralRMS        = 0.04;

// ===== ESTADO DE CRISIS =====
enum EstadoSistema { NORMAL, MONITOREO, CRISIS };
EstadoSistema estadoActual   = NORMAL;
EstadoSistema estadoAnterior = NORMAL;

int ventanasCriticasConsecutivas = 0;
const int ventanasMinimasParaAlarma = 2;

// ===== TRACKING DE EVENTO =====
time_t inicioEvento  = 0;
float  rmsDelEvento  = 0.0;
int    picosDelEvento = 0;
bool   alertaEnviada = false;

// ===== FILTRO Y BASELINE =====
float magnitudFiltrada = 0.0;
const float alphaFiltro = 0.35;
float baselineMagnitud  = 0.0;
const int   muestrasCalibracion = 100;

// ===== HELPERS =====

String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01T00:00:00";
  }
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buf);
}

time_t getEpoch() {
  time_t now;
  time(&now);
  return now;
}

const char* nombreEstado(EstadoSistema e) {
  switch(e) {
    case NORMAL:    return "normal";
    case MONITOREO: return "monitoreo";
    case CRISIS:    return "crisis";
    default:        return "desconocido";
  }
}

// ===== PUBLICAR ESTADO =====
void publicarEstado(const char* estadoStr) {
  StaticJsonDocument<256> doc;
  doc["tipo_mensaje"]   = "estado";
  doc["id_dispositivo"] = DEVICE_ID;
  doc["timestamp"]      = getTimestamp();
  doc["estado_actual"]  = estadoStr;

  char payload[256];
  serializeJson(doc, payload);
  mqtt.publish(topicEstado, payload);

  Serial.print("[MQTT estado] ");
  Serial.println(payload);
}

// ===== PUBLICAR ALERTA =====
// Se llama UNA SOLA VEZ al entrar en CRISIS.
// Incluye el timestamp de inicio de la crisis para que el dashboard
// sepa exactamente cuándo empezó el evento.
void publicarAlerta(time_t inicio) {
  struct tm ti;
  localtime_r(&inicio, &ti);
  char bufInicio[25];
  strftime(bufInicio, sizeof(bufInicio), "%Y-%m-%dT%H:%M:%S", &ti);

  StaticJsonDocument<256> doc;
  doc["tipo_mensaje"]   = "alerta";
  doc["id_dispositivo"] = DEVICE_ID;
  doc["timestamp"]      = getTimestamp();
  doc["deteccion"]      = true;
  doc["inicio_crisis"]  = bufInicio;  // ← cuando arrancó la crisis

  char payload[256];
  serializeJson(doc, payload);
  mqtt.publish(topicAlerta, payload);

  Serial.print("[MQTT alerta] ");
  Serial.println(payload);
}

// ===== PUBLICAR EVENTO =====
// Se llama cuando el sistema SALE de CRISIS y vuelve a NORMAL.
// Contiene todos los datos del evento: inicio, fin, duración, RMS y picos.
void publicarEvento(time_t inicio, time_t fin, float rms, int picos) {
  long duracion = (long)(fin - inicio);

  struct tm ti, tf;
  localtime_r(&inicio, &ti);
  localtime_r(&fin,    &tf);

  char bufInicio[25], bufFin[25];
  strftime(bufInicio, sizeof(bufInicio), "%Y-%m-%dT%H:%M:%S", &ti);
  strftime(bufFin,    sizeof(bufFin),    "%Y-%m-%dT%H:%M:%S", &tf);

  StaticJsonDocument<512> doc;
  doc["tipo_mensaje"]      = "evento";
  doc["id_dispositivo"]    = DEVICE_ID;
  doc["inicio_evento"]     = bufInicio;
  doc["fin_evento"]        = bufFin;
  doc["duracion_segundos"] = duracion;
  doc["rms"]               = rms;      // ← float directo, sin serialized()
  doc["cantidad_picos"]    = picos;

  char payload[512];
  serializeJson(doc, payload);
  mqtt.publish(topicEvento, payload);

  Serial.print("[MQTT evento] ");
  Serial.println(payload);
}

// ===== RECONEXIÓN MQTT =====
void reconnectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Reconectando broker...");
    if (mqtt.connect("esp32_epilepsia")) {
      Serial.println(" OK");
    } else {
      delay(2000);
    }
  }
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  mpu.initialize();

  if (!mpu.testConnection()) {
    Serial.println("Error: MPU6050 no detectado");
    while (1);
  }

  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");

  // NTP
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.print("Sincronizando NTP");
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");
  Serial.print("Hora actual: ");
  Serial.println(getTimestamp());

  // MQTT
  mqtt.setServer(broker, port);
  Serial.print("Conectando broker");
  while (!mqtt.connected()) {
    mqtt.connect("esp32_epilepsia");
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");

  publicarEstado("iniciando");

  // Calibración de baseline
  Serial.println("Calibrando baseline...");
  float sumaBaseline = 0.0;
  for (int i = 0; i < muestrasCalibracion; i++) {
    int16_t axRaw, ayRaw, azRaw;
    mpu.getAcceleration(&axRaw, &ayRaw, &azRaw);
    float ax = axRaw / 16384.0;
    float ay = ayRaw / 16384.0;
    float az = azRaw / 16384.0;
    sumaBaseline += sqrt(ax*ax + ay*ay + az*az);
    delay(20);
  }
  baselineMagnitud = sumaBaseline / muestrasCalibracion;
  Serial.print("Baseline: ");
  Serial.println(baselineMagnitud);

  publicarEstado("normal");
  Serial.println("Sistema listo");
}

// ===== LOOP =====
void loop() {
  if (!mqtt.connected()) reconnectMQTT();
  mqtt.loop();

  // Lectura del acelerómetro
  int16_t axRaw, ayRaw, azRaw;
  mpu.getAcceleration(&axRaw, &ayRaw, &azRaw);
  float ax = axRaw / 16384.0;
  float ay = ayRaw / 16384.0;
  float az = azRaw / 16384.0;
  float magnitudCruda = sqrt(ax*ax + ay*ay + az*az);

  float magnitudSinBaseline = abs(magnitudCruda - baselineMagnitud);
  magnitudFiltrada = alphaFiltro * magnitudSinBaseline + (1.0 - alphaFiltro) * magnitudFiltrada;

  ventanaMagnitud[indice] = magnitudFiltrada;
  indice++;

  bool analizarAhora = false;
  if (indice >= N) {
    indice = 0;
    ventanaLlena = true;
    analizarAhora = true;
  }

  if (ventanaLlena && analizarAhora) {
    // Calcular RMS
    float sumaCuadrados = 0.0;
    for (int i = 0; i < N; i++) sumaCuadrados += ventanaMagnitud[i] * ventanaMagnitud[i];
    float rms = sqrt(sumaCuadrados / N);

    // Calcular picos
    int picos = 0;
    for (int i = 1; i < N - 1; i++) {
      if (ventanaMagnitud[i] > umbralPico &&
          ventanaMagnitud[i] > ventanaMagnitud[i-1] &&
          ventanaMagnitud[i] > ventanaMagnitud[i+1]) {
        picos++;
      }
    }

    bool ventanaCritica = (rms > umbralRMS && picos >= cantidadPicosMin);

    // ===== MÁQUINA DE ESTADOS =====
    estadoAnterior = estadoActual;

    if (ventanaCritica) {
      ventanasCriticasConsecutivas++;

      // Acumular el peor RMS del evento
      if (rms > rmsDelEvento) {
        rmsDelEvento   = rms;
        picosDelEvento = picos;
      }

      if (ventanasCriticasConsecutivas == 1) {
        estadoActual = MONITOREO;
      }

      if (ventanasCriticasConsecutivas >= ventanasMinimasParaAlarma) {
        estadoActual = CRISIS;
      }

    } else {
      // ===========================================================
      // FIX: usamos estadoAnterior (== estado antes de esta ventana)
      // para detectar que SALIMOS de crisis.
      // estadoActual todavía no cambió en este punto.
      // ===========================================================
      if (estadoAnterior == CRISIS) {
        time_t finEvento = getEpoch();
        publicarEvento(inicioEvento, finEvento, rmsDelEvento, picosDelEvento);

        // Resetear tracking
        rmsDelEvento   = 0.0;
        picosDelEvento = 0;
        inicioEvento   = 0;
        alertaEnviada  = false;
      }

      ventanasCriticasConsecutivas = 0;
      estadoActual = NORMAL;
    }

    // ===== ACCIONES POR CAMBIO DE ESTADO =====

    // Publicar estado si cambió
    if (estadoActual != estadoAnterior) {
      publicarEstado(nombreEstado(estadoActual));
    }

    // Al entrar en CRISIS por primera vez en este evento:
    // 1. Guardar inicio del evento
    // 2. Activar buzzer
    // 3. Publicar alerta inmediatamente (con timestamp de inicio)
    if (estadoActual == CRISIS && estadoAnterior != CRISIS) {
      inicioEvento = getEpoch();           // ← primero guardamos el inicio
      digitalWrite(buzzerPin, HIGH);

      if (!alertaEnviada) {
        publicarAlerta(inicioEvento);      // ← alerta inmediata con inicio_crisis
        alertaEnviada = true;
      }
    }

    // Apagar buzzer si no estamos en crisis
    if (estadoActual != CRISIS) {
      digitalWrite(buzzerPin, LOW);
    }

    // Debug Serial
    Serial.println("------ VENTANA ------");
    Serial.print("RMS: ");                 Serial.println(rms, 4);
    Serial.print("Picos: ");              Serial.println(picos);
    Serial.print("Ventanas criticas: ");  Serial.println(ventanasCriticasConsecutivas);
    Serial.print("Estado: ");             Serial.println(nombreEstado(estadoActual));
    Serial.println("---------------------");
  }

  delay(100);
}
